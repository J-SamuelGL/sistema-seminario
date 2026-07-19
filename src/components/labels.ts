/** Etiquetas legibles para `problemas.categoriaProblema` (debugging/normal). */
export const ETIQUETAS_CATEGORIA: Record<string, string> = {
  debugging: 'Debugging',
  normal: 'Normal',
}

/** Formatea los argumentos de un caso de prueba como texto tipo `1, "hola", [1, 2]`. */
export function formatearArgumentos(argumentos: unknown[]): string {
  return argumentos.map((a) => JSON.stringify(a)).join(', ')
}
