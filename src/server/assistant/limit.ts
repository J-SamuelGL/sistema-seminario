export const LIMITE_PREGUNTAS_IA = 3

export function puedePreguntar(user: {
  categoria: string
  preguntasIaUsadas: number
}): boolean {
  return (
    user.categoria === 'invitado' &&
    user.preguntasIaUsadas < LIMITE_PREGUNTAS_IA
  )
}
