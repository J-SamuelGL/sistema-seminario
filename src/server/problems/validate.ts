export function validarDatosProblema(input: {
  titulo: string
  descripcion: string
  dificultad: string
  lenguajesPermitidos: string[]
}) {
  const errores: string[] = []
  if (!input.titulo.trim()) errores.push('El título es requerido')
  if (!input.descripcion.trim()) errores.push('La descripción es requerida')
  if (input.lenguajesPermitidos.length === 0) errores.push('Debe permitir al menos un lenguaje')
  return errores
}
