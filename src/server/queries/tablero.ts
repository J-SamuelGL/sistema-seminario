import { queryOptions } from '@tanstack/react-query'
import {
  obtenerActividadReciente,
  obtenerBeneficiosUsados,
  obtenerEstadisticasProblemas,
  obtenerActividadEnVivo,
} from '../functions/leaderboard'

const REFETCH_MS = 3000

export function actividadRecienteQueryOptions() {
  return queryOptions({
    queryKey: ['actividadReciente'],
    queryFn: () => obtenerActividadReciente(),
    refetchInterval: REFETCH_MS,
  })
}

export function beneficiosUsadosQueryOptions() {
  return queryOptions({
    queryKey: ['beneficiosUsados'],
    queryFn: () => obtenerBeneficiosUsados(),
    refetchInterval: REFETCH_MS,
  })
}

export function estadisticasProblemasQueryOptions() {
  return queryOptions({
    queryKey: ['estadisticasProblemas'],
    queryFn: () => obtenerEstadisticasProblemas(),
    refetchInterval: REFETCH_MS,
  })
}

export function actividadEnVivoQueryOptions() {
  return queryOptions({
    queryKey: ['actividadEnVivo'],
    queryFn: () => obtenerActividadEnVivo(),
    refetchInterval: REFETCH_MS,
  })
}
