/**
 * Ejecuta una consulta Drizzle limitándola a una fila y devuelve esa fila o
 * `null`, en vez del patrón repetido `const filas = await query; filas[0] ?? null`.
 */
export async function obtenerUnaFila<T>(query: {
  limit: (n: number) => Promise<T[]>
}): Promise<T | null> {
  const filas = await query.limit(1)
  return filas[0] ?? null
}
