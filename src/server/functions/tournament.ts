import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/client'
import { obtenerUnaFila } from '../db/uno'
import { torneos } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import {
  asegurarNoIniciado,
  asegurarIniciado,
  asegurarFinalizado,
} from '../tournament/guard'
import { obtenerTorneoActual } from '../tournament/actual'
import { archivarParticipantesDeTorneo } from '../participantes/archivar'
import { guardarProgresoPendiente } from '../tournament/progresoPendiente'
import { asignarBeneficios } from '../beneficios/asignar'

export const obtenerEstadoTorneo = createServerFn({ method: 'GET' }).handler(
  async () => {
    return obtenerTorneoActual()
  },
)

export const iniciarTorneo = createServerFn({ method: 'POST' }).handler(
  async () => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const torneo = await obtenerTorneoActual()
    if (!torneo) throw new Error('No hay ningún torneo creado todavía')
    asegurarNoIniciado(torneo)

    const iniciadoEn = new Date()
    await db
      .update(torneos)
      .set({ iniciadoEn })
      .where(eq(torneos.id, torneo.id))

    await asignarBeneficios(torneo.id)

    return { iniciadoEn }
  },
)

export const concluirTorneo = createServerFn({ method: 'POST' }).handler(
  async () => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const torneo = await obtenerTorneoActual()
    if (!torneo) throw new Error('No hay ningún torneo creado todavía')
    asegurarIniciado(torneo)

    const finalizadoEn = new Date()
    await db
      .update(torneos)
      .set({ finalizadoEn })
      .where(eq(torneos.id, torneo.id))

    await guardarProgresoPendiente(torneo.id, finalizadoEn)

    return { finalizadoEn }
  },
)

const crearTorneoSchema = z.object({
  anio: z.number().int().min(2000).max(2100),
})

export const crearTorneo = createServerFn({ method: 'POST' })
  .validator(crearTorneoSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const torneoActual = await obtenerTorneoActual()
    if (torneoActual) {
      asegurarFinalizado(torneoActual)
    }

    const existente = await obtenerUnaFila(
      db.select().from(torneos).where(eq(torneos.anio, data.anio)),
    )
    if (existente) throw new Error('Ya existe un torneo con ese año')

    const id = crypto.randomUUID()
    await db.insert(torneos).values({ id, anio: data.anio })

    if (torneoActual) {
      await archivarParticipantesDeTorneo(torneoActual.id)
    }

    return { id, anio: data.anio }
  })

export const listarTorneos = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    await requerirAdmin(request.headers)
    return db.select().from(torneos).orderBy(desc(torneos.creadoEn))
  },
)
