import { desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { obtenerUnaFila } from '../db/uno'
import { torneos } from '../db/schema'

export type Torneo = typeof torneos.$inferSelect

export async function obtenerTorneoActual(): Promise<Torneo | null> {
  return obtenerUnaFila(
    db.select().from(torneos).orderBy(desc(torneos.creadoEn)),
  )
}

export async function obtenerTorneoPorId(id: string): Promise<Torneo | null> {
  return obtenerUnaFila(db.select().from(torneos).where(eq(torneos.id, id)))
}

export function asegurarEsTorneoActual(
  torneoId: string,
  torneoActual: { id: string } | null,
) {
  if (!torneoActual || torneoActual.id !== torneoId) {
    throw new Error(
      'Este torneo ya no se puede editar (no es el torneo actual).',
    )
  }
}
