import { useMatchRoute } from '@tanstack/react-router'
import {
  NAV_LINK_BASE,
  NAV_LINK_ACTIVE,
  NAV_LINK_INACTIVE,
} from '#/components/brandStyles'

/** Clases (y estado activo) de un link de navbar, resaltado cuando `to` coincide
 * con la ruta actual. */
export function useActiveLinkClass() {
  const matchRoute = useMatchRoute()
  return function claseEnlace(to: string) {
    const activo = Boolean(matchRoute({ to, fuzzy: true }))
    return {
      className: `${NAV_LINK_BASE} ${activo ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}`,
      activo,
    }
  }
}
