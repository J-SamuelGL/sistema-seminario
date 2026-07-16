import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { estadoTorneo } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import { asegurarNoIniciado, asegurarIniciado } from '../tournament/guard'

export const obtenerEstadoTorneo = createServerFn({ method: 'GET' }).handler(async () => {
  const rows = await db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))
  const estado = rows.length > 0 ? rows[0] : null
  return estado ?? { id: 1, iniciadoEn: null, finalizadoEn: null }
})

export const iniciarTorneo = createServerFn({ method: 'POST' }).handler(async () => {
  const request = getRequest()
  await requerirAdmin(request.headers)

  const rows = await db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))
  const existente = rows.length > 0 ? rows[0] : null
  asegurarNoIniciado(existente ?? { iniciadoEn: null })

  const iniciadoEn = new Date()
  await db
    .insert(estadoTorneo)
    .values({ id: 1, iniciadoEn })
    .onDuplicateKeyUpdate({ set: { iniciadoEn } })

  return { iniciadoEn }
})

export const concluirTorneo = createServerFn({ method: 'POST' }).handler(async () => {
  const request = getRequest()
  await requerirAdmin(request.headers)

  const rows = await db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))
  const existente = rows.length > 0 ? rows[0] : null
  asegurarIniciado(existente ?? { iniciadoEn: null, finalizadoEn: null })

  const finalizadoEn = new Date()
  await db.update(estadoTorneo).set({ finalizadoEn }).where(eq(estadoTorneo.id, 1))

  return { finalizadoEn }
})
