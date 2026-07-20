import { queryOptions } from '@tanstack/react-query'
import { contarMisSesionesActivas } from '../functions/sesiones'

export function misSesionesActivasQueryOptions() {
  return queryOptions({
    queryKey: ['misSesionesActivas'],
    queryFn: () => contarMisSesionesActivas(),
    // El conteo debe re-verificarse cada vez que se entra a la página de un
    // problema, no servirse de caché.
    staleTime: 0,
    refetchOnMount: 'always',
  })
}
