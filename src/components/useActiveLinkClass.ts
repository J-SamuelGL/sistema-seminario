import { useMatchRoute } from '@tanstack/react-router'

const ENLACE_CLASSNAME = 'border-b-2 py-1 text-sm font-medium'
const ENLACE_ACTIVO = 'border-blue-600 text-blue-600'
const ENLACE_INACTIVO = 'border-transparent text-gray-700 hover:text-blue-600'

/** Clases de un link de navbar, resaltado cuando `to` coincide con la ruta actual. */
export function useActiveLinkClass() {
  const matchRoute = useMatchRoute()
  return function claseEnlace(to: string) {
    return `${ENLACE_CLASSNAME} ${matchRoute({ to, fuzzy: true }) ? ENLACE_ACTIVO : ENLACE_INACTIVO}`
  }
}
