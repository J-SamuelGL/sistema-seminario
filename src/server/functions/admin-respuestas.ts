import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios, envios, problemas, estadoTorneo, corridas } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import { calcularClasificacion, agruparClasificacionPorCategoria } from '../standings/calculate'
import { calcularDuraciones } from '../standings/duracion'
import { grupoDeCategoria } from '../problems/grupo'
import { aplicarCambioEstadoManual, actualizarEstadoProgresoSchema } from '../envios/progreso'
import { idSchema } from '../validacion/comun'
import type { RegistroUsuario, RegistroEnvio, RegistroProblema } from '../standings/calculate'

async function cargarDatosClasificacion() {
  const filasEstado = await db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))
  const torneoIniciadoEn = filasEstado.length > 0 ? filasEstado[0].iniciadoEn : null

  const [todosUsuarios, todosEnvios, todosProblemas] = await Promise.all([
    db.select().from(usuarios),
    db.select().from(envios),
    db.select().from(problemas),
  ])

  const usuariosElegibles: RegistroUsuario[] = todosUsuarios
    .filter((u) => u.rol === 'participante')
    .map((u) => ({ id: u.id, nombre: u.name, categoria: u.categoria }))

  const registrosEnvios: RegistroEnvio[] = todosEnvios.map((e) => ({
    usuarioId: e.usuarioId,
    problemaId: e.problemaId,
    estadoProgreso: e.estadoProgreso,
    creadoEn: e.creadoEn,
  }))

  const registrosProblemas: RegistroProblema[] = todosProblemas.map((p) => ({ id: p.id, puntos: p.puntos }))

  const clasificacion = calcularClasificacion(
    usuariosElegibles,
    registrosEnvios,
    registrosProblemas,
    torneoIniciadoEn ?? new Date(),
  )

  return { clasificacion, todosUsuarios, todosProblemas, torneoIniciadoEn }
}

export const listarParticipantesConProgreso = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  await requerirAdmin(request.headers)

  const { clasificacion, todosUsuarios, todosProblemas } = await cargarDatosClasificacion()

  const totalPorGrupo = {
    invitado_junior: todosProblemas.filter((p) => p.grupo === 'invitado_junior').length,
    senior: todosProblemas.filter((p) => p.grupo === 'senior').length,
  }

  const asistieron = new Set(
    todosUsuarios.filter((u) => u.rol === 'participante' && u.ingresadoEn !== null).map((u) => u.id),
  )

  const agrupado = agruparClasificacionPorCategoria(clasificacion.filter((f) => asistieron.has(f.usuarioId)))

  return (['invitado', 'junior', 'senior'] as const).flatMap((categoria) =>
    agrupado[categoria].map((fila, i) => ({
      usuarioId: fila.usuarioId,
      nombre: fila.nombre,
      categoria: fila.categoria,
      cantidadCompletados: fila.cantidadResueltos,
      cantidadPendientes: totalPorGrupo[grupoDeCategoria(fila.categoria)] - fila.cantidadResueltos,
      puntosTotales: fila.puntosTotales,
      puesto: i + 1,
    })),
  )
})

export const obtenerProgresoParticipante = createServerFn({ method: 'GET' })
  .validator(idSchema)
  .handler(async ({ data: usuarioId }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const filasUsuario = await db.select().from(usuarios).where(eq(usuarios.id, usuarioId))
    const usuario = filasUsuario.length > 0 ? filasUsuario[0] : null
    if (!usuario) throw new Error('Participante no encontrado')

    const { clasificacion, torneoIniciadoEn } = await cargarDatosClasificacion()
    const clasificacionCategoria = clasificacion.filter((f) => f.categoria === usuario.categoria)
    const indice = clasificacionCategoria.findIndex((f) => f.usuarioId === usuarioId)
    const filaClasificacion = indice >= 0 ? clasificacionCategoria[indice] : null

    const grupo = grupoDeCategoria(usuario.categoria)
    const [problemasDelGrupo, enviosDelUsuario, corridasDelUsuario] = await Promise.all([
      db.select().from(problemas).where(eq(problemas.grupo, grupo)).orderBy(problemas.orden),
      db.select().from(envios).where(eq(envios.usuarioId, usuarioId)),
      db.select().from(corridas).where(eq(corridas.usuarioId, usuarioId)),
    ])

    const envioPorProblema = new Map(enviosDelUsuario.map((e) => [e.problemaId, e]))
    const corridaPorProblema = new Map(corridasDelUsuario.map((c) => [c.problemaId, c]))

    const resueltos = enviosDelUsuario
      .filter((e) => e.estadoProgreso !== 'pendiente')
      .map((e) => ({ problemaId: e.problemaId, creadoEn: e.creadoEn }))
    const duraciones = new Map(
      calcularDuraciones(resueltos, torneoIniciadoEn ?? new Date()).map((d) => [d.problemaId, d.duracionMinutos]),
    )

    const problemasConEstado = problemasDelGrupo.map((p) => {
      const envio = envioPorProblema.get(p.id)
      const corrida = corridaPorProblema.get(p.id)
      return {
        problemaId: p.id,
        titulo: p.titulo,
        dificultad: p.dificultad,
        categoriaProblema: p.categoriaProblema,
        estadoProgreso: envio?.estadoProgreso ?? ('pendiente' as const),
        creadoEn: envio?.creadoEn ?? null,
        duracionMinutos: duraciones.get(p.id) ?? null,
        codigo: envio?.codigo ?? corrida?.ultimoCodigo ?? null,
        lenguaje: envio?.lenguaje ?? corrida?.ultimoLenguaje ?? null,
        resultados: envio?.resultados ?? corrida?.ultimosResultados ?? null,
      }
    })

    return {
      participante: { id: usuario.id, nombre: usuario.name, categoria: usuario.categoria },
      puntosTotales: filaClasificacion?.puntosTotales ?? 0,
      puesto: indice >= 0 ? indice + 1 : null,
      problemas: problemasConEstado,
    }
  })

export const actualizarEstadoProgreso = createServerFn({ method: 'POST' })
  .validator(actualizarEstadoProgresoSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const admin = await requerirAdmin(request.headers)

    const filasCorrida = await db
      .select()
      .from(corridas)
      .where(and(eq(corridas.usuarioId, data.usuarioId), eq(corridas.problemaId, data.problemaId)))
    const corrida = filasCorrida.length > 0 ? filasCorrida[0] : null

    const campos = aplicarCambioEstadoManual(
      data.estadoProgreso,
      admin.id,
      new Date(),
      corrida?.ultimaEjecucionEn ?? null,
    )

    const filasEnvio = await db
      .select()
      .from(envios)
      .where(and(eq(envios.usuarioId, data.usuarioId), eq(envios.problemaId, data.problemaId)))
    const envioExistente = filasEnvio.length > 0 ? filasEnvio[0] : null

    if (envioExistente) {
      await db.update(envios).set(campos).where(eq(envios.id, envioExistente.id))
    } else {
      await db.insert(envios).values({
        usuarioId: data.usuarioId,
        problemaId: data.problemaId,
        codigo: corrida?.ultimoCodigo ?? '',
        lenguaje: corrida?.ultimoLenguaje ?? '',
        estado: corrida?.ultimoVeredicto ?? 'pendiente',
        resultados: corrida?.ultimosResultados,
        ...campos,
      })
    }
  })
