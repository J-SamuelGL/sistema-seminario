import { queryOptions } from '@tanstack/react-query'
import { obtenerClasificacion } from '../functions/leaderboard'

export function clasificacionQueryOptions() {
  return queryOptions({
    queryKey: ['clasificacion'],
    queryFn: () => obtenerClasificacion(),
    refetchInterval: 3000,
  })
}
