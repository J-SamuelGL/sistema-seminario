import { queryOptions } from '@tanstack/react-query'
import { obtenerParticipantes } from '../functions/participantes'

export function participantesQueryOptions() {
  return queryOptions({
    queryKey: ['participantes'],
    queryFn: () => obtenerParticipantes(),
    refetchInterval: 3000,
  })
}
