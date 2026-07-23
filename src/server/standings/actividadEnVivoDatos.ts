import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios, corridas, problemas } from '../db/schema'
import { calcularActividadEnVivo } from './actividadEnVivo'
import type { RegistroCorridaActividad } from './actividadEnVivo'

const VENTANA_ACTIVIDAD_MINUTOS = 10

export async function cargarActividadEnVivo(torneoId: string) {
  const filas: RegistroCorridaActividad[] = await db
    .select({
      usuarioId: corridas.usuarioId,
      usuarioNombre: usuarios.name,
      usuarioCategoria: usuarios.categoria,
      problemaTitulo: problemas.titulo,
      ultimaEjecucionEn: corridas.ultimaEjecucionEn,
    })
    .from(corridas)
    .innerJoin(usuarios, eq(usuarios.id, corridas.usuarioId))
    .innerJoin(problemas, eq(problemas.id, corridas.problemaId))
    .where(eq(usuarios.torneoId, torneoId))

  return calcularActividadEnVivo(filas, new Date(), VENTANA_ACTIVIDAD_MINUTOS)
}
