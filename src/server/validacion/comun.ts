import { z } from 'zod'

// Límite real de una columna MySQL `text` (drizzle `text()`), en bytes/caracteres.
export const TEXT_MAX = 65535

export const idSchema = z.uuid()

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(255) // usuarios.email es varchar(255)
  .pipe(z.email())

export function textoRequerido(mensaje: string) {
  return z.string().trim().min(1, mensaje).max(TEXT_MAX)
}

export function textoOpcional() {
  return z.string().trim().max(TEXT_MAX).nullable()
}
