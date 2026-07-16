import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

declare global {
  var __pool: mysql.Pool | undefined
}

// Reutiliza el pool a través de recargas HMR de Vite en dev; si no, cada
// recarga de este módulo crea un pool nuevo sin cerrar el anterior y termina
// agotando las conexiones de MySQL ("Too many connections").
const pool = globalThis.__pool ?? mysql.createPool(process.env.DATABASE_URL!)
if (process.env.NODE_ENV !== 'production') {
  globalThis.__pool = pool
}

export const db = drizzle(pool, { schema, mode: 'default' })
