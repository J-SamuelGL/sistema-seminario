import { queryOptions } from '@tanstack/react-query'
import {
  listarParticipantesConProgreso,
  obtenerProgresoParticipante,
} from '../functions/admin-respuestas'

export function participantesConProgresoQueryOptions() {
  return queryOptions({
    queryKey: ['respuestas'],
    queryFn: () => listarParticipantesConProgreso(),
    refetchInterval: 3000,
  })
}

export function progresoParticipanteQueryOptions(usuarioId: string) {
  return queryOptions({
    queryKey: ['respuestas', usuarioId],
    queryFn: () => obtenerProgresoParticipante({ data: usuarioId }),
    refetchInterval: 3000,
  })
}
