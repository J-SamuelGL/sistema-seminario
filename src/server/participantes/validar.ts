export type Semestre = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
export type Categoria = 'invitado' | 'junior' | 'senior'

export function validarDatosParticipante(input: {
  categoria: Categoria
  carnet: string | null
  semestre: Semestre | null
}): { valido: true } | { valido: false; motivo: string } {
  if (input.categoria === 'junior' || input.categoria === 'senior') {
    if (!input.carnet) {
      return { valido: false, motivo: 'El carné es obligatorio para Junior y Senior.' }
    }
    if (!input.semestre) {
      return { valido: false, motivo: 'El semestre es obligatorio para Junior y Senior.' }
    }
  }
  return { valido: true }
}
