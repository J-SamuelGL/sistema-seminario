import { eq, inArray } from 'drizzle-orm'
import { db } from '../db/client'
import { corridas, usuarios, envios } from '../db/schema'

export async function guardarProgresoPendiente(
  torneoId: string,
  finalizadoEn: Date,
) {
  const corridasDelTorneo = await db
    .select({
      usuarioId: corridas.usuarioId,
      problemaId: corridas.problemaId,
      ultimoCodigo: corridas.ultimoCodigo,
      ultimoLenguaje: corridas.ultimoLenguaje,
      ultimoVeredicto: corridas.ultimoVeredicto,
      ultimosResultados: corridas.ultimosResultados,
      ultimaEjecucionEn: corridas.ultimaEjecucionEn,
    })
    .from(corridas)
    .innerJoin(usuarios, eq(usuarios.id, corridas.usuarioId))
    .where(eq(usuarios.torneoId, torneoId))

  if (corridasDelTorneo.length === 0) return

  const usuariosDelTorneo = corridasDelTorneo.map((c) => c.usuarioId)
  const enviosExistentes = await db
    .select({ usuarioId: envios.usuarioId, problemaId: envios.problemaId })
    .from(envios)
    .where(inArray(envios.usuarioId, usuariosDelTorneo))
  const clavesExistentes = new Set(
    enviosExistentes.map((e) => `${e.usuarioId}:${e.problemaId}`),
  )

  for (const corrida of corridasDelTorneo) {
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
