import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { problemas, envios } from '../db/schema'
import { requerirParticipanteIngresado } from '../auth/middleware'
import { grupoDeCategoria } from '../problems/grupo'
import { calcularDuraciones } from '../standings/duracion'
import { cargarDatosClasificacion } from '../standings/datos'
import { calcularPuestoEntreAsistentes } from '../standings/asistentes'

export const obtenerMiProgreso = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const user = await requerirParticipanteIngresado(request.headers)

    if (user.rol === 'admin') {
      return { puntosTotales: 0, puesto: null, problemas: [] }
    }

    const { clasificacion, todosUsuarios, torneoIniciadoEn } =
      await cargarDatosClasificacion()
    const clasificacionCategoria = clasificacion.filter(
      (f) => f.categoria === user.categoria,
    )
    const filaClasificacion =
      clasificacionCategoria.find((f) => f.usuarioId === user.id) ?? null

    const puesto = calcularPuestoEntreAsistentes(
      clasificacionCategoria,
      todosUsuarios,
      user.id,
    )

    const grupo = grupoDeCategoria(
      user.categoria as 'invitado' | 'junior' | 'senior',
    )
    const [problemasDelGrupo, enviosDelUsuario] = await Promise.all([
      db
        .select()
        .from(problemas)
        .where(eq(problemas.grupo, grupo))
        .orderBy(problemas.orden),
      db.select().from(envios).where(eq(envios.usuarioId, user.id)),
    ])

    const envioPorProblema = new Map(
      enviosDelUsuario.map((e) => [e.problemaId, e]),
    )
    const resueltos = enviosDelUsuario
      .filter((e) => e.estadoProgreso !== 'pendiente')
      .map((e) => ({ problemaId: e.problemaId, creadoEn: e.creadoEn }))
    const duraciones = new Map(
      calcularDuraciones(resueltos, torneoIniciadoEn ?? new Date()).map((d) => [
        d.problemaId,
        d.duracionMinutos,
      ]),
    )

    const problemasConEstado = problemasDelGrupo.map((p) => {
      const envio = envioPorProblema.get(p.id)
      return {
        problemaId: p.id,
        estadoProgreso: envio?.estadoProgreso ?? ('pendiente' as const),
        duracionMinutos: duraciones.get(p.id) ?? null,
      }
    })

    return {
      puntosTotales: filaClasificacion?.puntosTotales ?? 0,
      puesto,
      problemas: problemasConEstado,
    }
  },
)
