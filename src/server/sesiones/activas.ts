import { and, eq, gt, ne } from 'drizzle-orm'
import { db } from '../db/client'
import { sesiones } from '../db/schema'

export async function contarSesionesActivas(usuarioId: string) {
  const filas = await db
    .select({ id: sesiones.id })
    .from(sesiones)
    .where(
      and(eq(sesiones.userId, usuarioId), gt(sesiones.expiresAt, new Date())),
    )
  return filas.length
}

// Borrar la fila de `sesion` revoca la sesión de inmediato: better-auth no
// tiene cookieCache configurado, así que cada request valida el token contra
// la base de datos.
export async function cerrarOtrasSesiones(
  usuarioId: string,
  sesionActualId: string,
) {
  const [resultado] = await db
    .delete(sesiones)
    .where(and(eq(sesiones.userId, usuarioId), ne(sesiones.id, sesionActualId)))
  return resultado.affectedRows
}

export async function cerrarTodasLasSesiones(usuarioId: string) {
  const [resultado] = await db
    .delete(sesiones)
    .where(eq(sesiones.userId, usuarioId))
  return resultado.affectedRows
}
