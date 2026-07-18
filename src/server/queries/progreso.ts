import { queryOptions } from '@tanstack/react-query'
import { obtenerMiProgreso } from '../functions/progreso'

export function miProgresoQueryOptions() {
  return queryOptions({
    queryKey: ['miProgreso'],
    queryFn: () => obtenerMiProgreso(),
  })
}
