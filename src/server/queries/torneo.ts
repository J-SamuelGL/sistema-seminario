import { queryOptions } from '@tanstack/react-query'
import { obtenerEstadoTorneo } from '../functions/tournament'

export function estadoTorneoQueryOptions() {
  return queryOptions({
    queryKey: ['estadoTorneo'],
    queryFn: () => obtenerEstadoTorneo(),
  })
}
