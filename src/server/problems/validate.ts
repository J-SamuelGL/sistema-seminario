export function validateProblemInput(input: {
  title: string
  description: string
  difficulty: string
  allowedLanguages: string[]
}) {
  const errors: string[] = []
  if (!input.title.trim()) errors.push('El título es requerido')
  if (!input.description.trim()) errors.push('La descripción es requerida')
  if (input.allowedLanguages.length === 0) errors.push('Debe permitir al menos un lenguaje')
  return errors
}
