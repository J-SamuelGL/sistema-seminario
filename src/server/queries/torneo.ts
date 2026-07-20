import { queryOptions } from '@tanstack/react-query'
import { obtenerEstadoTorneo, listarTorneos } from '../functions/tournament'

export function estadoTorneoQueryOptions() {
  return queryOptions({
    queryKey: ['estadoTorneo'],
    queryFn: () => obtenerEstadoTorneo(),
  })
}

export function torneosQueryOptions() {
  return queryOptions({
    queryKey: ['torneos'],
    queryFn: () => listarTorneos(),
  })
}
