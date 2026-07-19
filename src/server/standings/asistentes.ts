type UsuarioConIngreso = { id: string; rol: string; ingresadoEn: Date | null }

/**
 * El puesto en la clasificación pública se calcula solo entre participantes
 * que hicieron check-in (no todo el que tiene una fila en `usuarios`).
 */
export function filtrarAsistentes<TFila extends { usuarioId: string }>(
  clasificacion: TFila[],
  todosUsuarios: UsuarioConIngreso[],
): TFila[] {
  const asistieron = new Set(
    todosUsuarios
      .filter((u) => u.rol === 'participante' && u.ingresadoEn !== null)
      .map((u) => u.id),
  )
  return clasificacion.filter((f) => asistieron.has(f.usuarioId))
}

export function calcularPuestoEntreAsistentes<
  TFila extends { usuarioId: string },
>(
  clasificacion: TFila[],
  todosUsuarios: UsuarioConIngreso[],
  usuarioId: string,
): number | null {
  const indice = filtrarAsistentes(clasificacion, todosUsuarios).findIndex(
    (f) => f.usuarioId === usuarioId,
  )
  return indice >= 0 ? indice + 1 : null
}
