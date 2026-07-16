import { queryOptions } from '@tanstack/react-query'
import { obtenerUsuarioActual, obtenerUsuarioActualOpcional } from '../functions/auth'

export function usuarioActualOpcionalQueryOptions() {
  return queryOptions({
    queryKey: ['usuarioActualOpcional'],
    queryFn: () => obtenerUsuarioActualOpcional(),
    refetchInterval: 3000,
  })
}

export function usuarioActualQueryOptions() {
  return queryOptions({
    queryKey: ['usuarioActual'],
    queryFn: () => obtenerUsuarioActual(),
  })
}
