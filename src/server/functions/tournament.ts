import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { estadoTorneo, corridas, envios } from '../db/schema'
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

  await guardarProgresoPendiente(finalizadoEn)

  return { finalizadoEn }
})

async function guardarProgresoPendiente(finalizadoEn: Date) {
  const todasLasCorridas = await db.select().from(corridas)
  const enviosExistentes = await db
    .select({ usuarioId: envios.usuarioId, problemaId: envios.problemaId })
    .from(envios)
  const clavesExistentes = new Set(enviosExistentes.map((e) => `${e.usuarioId}:${e.problemaId}`))

  for (const corrida of todasLasCorridas) {
    const clave = `${corrida.usuarioId}:${corrida.problemaId}`
    if (clavesExistentes.has(clave)) continue

    await db.insert(envios).values({
      usuarioId: corrida.usuarioId,
      problemaId: corrida.problemaId,
      codigo: corrida.ultimoCodigo ?? '',
      lenguaje: corrida.ultimoLenguaje ?? '',
      estado: corrida.ultimoVeredicto ?? 'pendiente',
      estadoProgreso: 'pendiente',
      resultados: corrida.ultimosResultados,
      creadoEn: corrida.ultimaEjecucionEn ?? finalizadoEn,
    })
  }
}
