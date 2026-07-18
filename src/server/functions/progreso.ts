import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { problemas, envios } from '../db/schema'
import { requerirParticipanteIngresado } from '../auth/middleware'
import { grupoDeCategoria } from '../problems/grupo'
import { calcularDuraciones } from '../standings/duracion'
import { cargarDatosClasificacion } from './admin-respuestas'

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

    // el puesto se calcula solo sobre participantes que hicieron check-in, igual que en /admin/respuestas
    const asistieron = new Set(
      todosUsuarios
        .filter((u) => u.rol === 'participante' && u.ingresadoEn !== null)
        .map((u) => u.id),
    )
    const indice = clasificacionCategoria
      .filter((f) => asistieron.has(f.usuarioId))
      .findIndex((f) => f.usuarioId === user.id)

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
      puesto: indice >= 0 ? indice + 1 : null,
      problemas: problemasConEstado,
    }
  },
)
