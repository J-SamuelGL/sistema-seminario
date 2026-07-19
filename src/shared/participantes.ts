// Vive en `src/shared` (no en `src/server`) porque `puedeEliminarParticipante`
// se usa tanto en el servidor (`src/server/functions/participantes.ts`, para
// autorizar de verdad el borrado) como en el cliente (`admin/participantes.tsx`,
// para deshabilitar el botón y mostrar el motivo sin esperar un roundtrip). Es
// una función pura — no depende de `db/client` ni de ningún otro módulo
// server-only — por lo que puede vivir fuera de la convención server-fn.
export function puedeEliminarParticipante(input: {
  rol: 'participante' | 'admin'
  cantidadEnvios: number
}): { puede: true } | { puede: false; motivo: string } {
  if (input.rol !== 'participante') {
    return {
      puede: false,
      motivo: 'Solo se pueden eliminar cuentas de participante desde aquí.',
    }
  }
  if (input.cantidadEnvios > 0) {
    return {
      puede: false,
      motivo:
        'Este participante ya tiene envíos registrados; eliminarlo alteraría el leaderboard.',
    }
  }
  return { puede: true }
}
