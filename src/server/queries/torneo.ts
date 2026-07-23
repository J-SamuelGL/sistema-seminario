import { queryOptions } from '@tanstack/react-query'
import { obtenerEstadoTorneo, listarTorneos } from '../functions/tournament'

// Mismo intervalo que las queries de tablero.ts (REFETCH_MS): así el
// countdown público refleja sin recargar la página cuando un admin concluye
// el torneo mientras alguien tiene /clasificacion abierto.
const REFETCH_MS = 3000

export function estadoTorneoQueryOptions() {
  return queryOptions({
    queryKey: ['estadoTorneo'],
    queryFn: () => obtenerEstadoTorneo(),
    refetchInterval: REFETCH_MS,
  })
}

export function torneosQueryOptions() {
  return queryOptions({
    queryKey: ['torneos'],
    queryFn: () => listarTorneos(),
  })
}
