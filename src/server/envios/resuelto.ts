import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import type { problemas } from '../db/schema';
import { envios } from '../db/schema'
import { calcularDuraciones } from '../standings/duracion'

export async function calcularResueltoParaUsuario(
  usuarioId: string,
  problema: typeof problemas.$inferSelect,
  torneoIniciadoEn: Date,
): Promise<{ duracionMinutos: number; puntos: number } | null> {
  const enviosDelUsuario = await db
    .select()
    .from(envios)
    .where(eq(envios.usuarioId, usuarioId))
  const envioDeEsteProblema = enviosDelUsuario.find(
    (e) => e.problemaId === problema.id,
  )
  if (
    !envioDeEsteProblema ||
    envioDeEsteProblema.estadoProgreso === 'pendiente'
  )
    return null

  const resueltos = enviosDelUsuario
    .filter((e) => e.estadoProgreso !== 'pendiente')
    .map((e) => ({ problemaId: e.problemaId, creadoEn: e.creadoEn }))
  const duraciones = calcularDuraciones(resueltos, torneoIniciadoEn)
  const duracionMinutos =
    duraciones.find((d) => d.problemaId === problema.id)?.duracionMinutos ?? 0

  return { duracionMinutos, puntos: problema.puntos }
}
