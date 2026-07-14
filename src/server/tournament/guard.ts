export function assertNotStarted(state: { startedAt: Date | null }) {
  if (state.startedAt) {
    throw new Error('El torneo ya comenzó')
  }
}

export function assertStarted(state: { startedAt: Date | null }) {
  if (!state.startedAt) {
    throw new Error('El torneo aún no ha comenzado')
  }
}
