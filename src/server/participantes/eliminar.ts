export function puedeEliminarParticipante(input: {
  rol: 'participante' | 'admin'
  cantidadEnvios: number
}): { puede: true } | { puede: false; motivo: string } {
  if (input.rol !== 'participante') {
    return { puede: false, motivo: 'Solo se pueden eliminar cuentas de participante desde aquí.' }
  }
  if (input.cantidadEnvios > 0) {
    return {
      puede: false,
      motivo: 'Este participante ya tiene envíos registrados; eliminarlo alteraría el leaderboard.',
    }
  }
  return { puede: true }
}
