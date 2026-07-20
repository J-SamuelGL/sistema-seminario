import { queryOptions } from '@tanstack/react-query'
import {
  listarParticipantesConProgresoDeTorneo,
  obtenerProgresoParticipante,
} from '../functions/admin-respuestas'

export function historialParticipantesQueryOptions(torneoId: string) {
  return queryOptions({
    queryKey: ['historial', torneoId],
    queryFn: () => listarParticipantesConProgresoDeTorneo({ data: torneoId }),
  })
}

export function historialParticipanteDetalleQueryOptions(usuarioId: string) {
  return queryOptions({
    queryKey: ['historial-detalle', usuarioId],
    queryFn: () => obtenerProgresoParticipante({ data: usuarioId }),
  })
}
