import { queryOptions } from '@tanstack/react-query'
import { obtenerUsuarioActualOpcional } from '../functions/auth'

export function usuarioActualOpcionalQueryOptions() {
  return queryOptions({
    queryKey: ['usuarioActualOpcional'],
    queryFn: () => obtenerUsuarioActualOpcional(),
    refetchInterval: 3000,
  })
}
