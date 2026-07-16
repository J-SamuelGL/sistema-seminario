import { queryOptions } from '@tanstack/react-query'
import { listarTodosLosEnvios } from '../functions/admin-submissions'

export function enviosQueryOptions() {
  return queryOptions({
    queryKey: ['envios'],
    queryFn: () => listarTodosLosEnvios(),
    refetchInterval: 3000,
  })
}
