import { Link, useMatchRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'
import { useCerrarSesion } from './useCerrarSesion'

const ENLACE_CLASSNAME = 'border-b-2 py-1 text-sm font-medium'
const ENLACE_INACTIVO = 'border-transparent text-gray-700 hover:text-blue-600'
const ENLACE_ACTIVO = 'border-blue-600 text-blue-600'

export function NavbarParticipante() {
  const { data: usuario } = useSuspenseQuery(
    usuarioActualOpcionalQueryOptions(),
  )
  const cerrarSesion = useCerrarSesion()
  const matchRoute = useMatchRoute()

  if (!usuario) {
    return (
      <nav className="border-b bg-gray-50 px-4 py-2">
        <span className="text-sm font-medium text-gray-700">
          Torneo de Programación
        </span>
      </nav>
    )
  }

  function claseEnlace(to: string) {
    return `${ENLACE_CLASSNAME} ${matchRoute({ to, fuzzy: true }) ? ENLACE_ACTIVO : ENLACE_INACTIVO}`
  }

  return (
    <nav className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
      <div className="flex gap-4">
        <Link to="/perfil" className={claseEnlace('/perfil')}>
          Perfil
        </Link>
        {usuario.ingresadoEn && (
          <>
            <Link to="/problemas" className={claseEnlace('/problemas')}>
              Problemas
            </Link>
            <Link to="/clasificacion" className={claseEnlace('/clasificacion')}>
              Clasificación
            </Link>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{usuario.name}</span>
        <button
          className="text-sm text-red-600 underline"
          onClick={() => cerrarSesion()}
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  )
}
