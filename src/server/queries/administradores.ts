import { queryOptions } from '@tanstack/react-query'
import { obtenerAdministradores } from '../functions/administradores'

export function administradoresQueryOptions() {
  return queryOptions({
    queryKey: ['administradores'],
    queryFn: () => obtenerAdministradores(),
    refetchInterval: 3000,
  })
}
