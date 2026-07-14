export function puedePreguntar(user: {
  categoria: string
  preguntasIaUsadas: number
}): boolean {
  return user.categoria === 'junior' && user.preguntasIaUsadas < 2
}
