import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios, envios, problemas } from '../db/schema'
import type { Categoria } from '../../shared/dominio'

export type ActividadRecienteItem = {
  usuarioId: string
  usuarioNombre: string
  usuarioCategoria: Categoria
  problemaTitulo: string
  puntos: number
  creadoEn: Date
}

export async function cargarActividadReciente(
  torneoId: string,
  limite: number,
): Promise<ActividadRecienteItem[]> {
  return db
    .select({
      usuarioId: envios.usuarioId,
      usuarioNombre: usuarios.name,
      usuarioCategoria: usuarios.categoria,
      problemaTitulo: problemas.titulo,
      puntos: problemas.puntos,
      creadoEn: envios.creadoEn,
    })
    .from(envios)
    .innerJoin(usuarios, eq(usuarios.id, envios.usuarioId))
    .innerJoin(problemas, eq(problemas.id, envios.problemaId))
    .where(
      and(eq(usuarios.torneoId, torneoId), inArray(envios.estadoProgreso, ['completado', 'aprobado_manual'])),
    )
    .orderBy(desc(envios.creadoEn))
    .limit(limite)
}
