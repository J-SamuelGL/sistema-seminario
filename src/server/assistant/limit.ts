export function puedePreguntar(user: {
  categoria: string
  preguntasIaUsadas: number
}): boolean {
  return user.categoria === 'invitado' && user.preguntasIaUsadas < 3
}
