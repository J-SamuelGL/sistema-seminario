export function assertNotStarted(state: { startedAt: Date | null }) {
  if (state.startedAt) {
    throw new Error('El torneo ya comenzó')
  }
}
