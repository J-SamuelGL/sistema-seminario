export function asegurarNoIniciado(estado: { iniciadoEn: Date | null }) {
  if (estado.iniciadoEn) {
    throw new Error('El torneo ya comenzó')
  }
}

export function asegurarIniciado(estado: { iniciadoEn: Date | null; finalizadoEn?: Date | null }) {
  if (!estado.iniciadoEn) {
    throw new Error('El torneo aún no ha comenzado')
  }
  if (estado.finalizadoEn) {
    throw new Error('El torneo ya concluyó')
  }
}
