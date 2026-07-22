import { useMatchRoute } from '@tanstack/react-router'
import {
  ADMIN_NAV_LINK_BASE,
  ADMIN_NAV_LINK_ACTIVE,
  ADMIN_NAV_LINK_INACTIVE,
} from '#/components/adminBrandStyles'

/** Igual que useActiveLinkClass, pero con la identidad neutra de admin. */
export function useAdminActiveLinkClass() {
  const matchRoute = useMatchRoute()
  return function claseEnlace(to: string) {
    const activo = matchRoute({ to, fuzzy: true })
    return `${ADMIN_NAV_LINK_BASE} ${activo ? ADMIN_NAV_LINK_ACTIVE : ADMIN_NAV_LINK_INACTIVE}`
  }
}
