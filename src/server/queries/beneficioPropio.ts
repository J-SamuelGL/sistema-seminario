import { queryOptions } from '@tanstack/react-query'
import { obtenerBeneficioPropio } from '../functions/beneficios'

export function beneficioPropioQueryOptions() {
  return queryOptions({
    queryKey: ['beneficioPropio'],
    queryFn: () => obtenerBeneficioPropio(),
  })
}
