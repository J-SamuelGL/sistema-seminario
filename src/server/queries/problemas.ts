import { queryOptions } from '@tanstack/react-query'
import { listarProblemas, obtenerProblema } from '../functions/problems'

export function problemasQueryOptions() {
  return queryOptions({
    queryKey: ['problemas'],
    queryFn: () => listarProblemas(),
  })
}

export function problemaQueryOptions(problemaId: string) {
  return queryOptions({
    queryKey: ['problemas', problemaId],
    queryFn: () => obtenerProblema({ data: problemaId }),
  })
}
