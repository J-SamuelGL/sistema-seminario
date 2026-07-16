import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'
import { useCerrarSesion } from './useCerrarSesion'

export function NavbarParticipante() {
  const { data: usuario } = useSuspenseQuery(usuarioActualOpcionalQueryOptions())
  const cerrarSesion = useCerrarSesion()

  if (!usuario) {
    return (
      <nav className="border-b bg-gray-50 px-4 py-2">
        <span className="text-sm font-medium text-gray-700">Torneo de Programación</span>
      </nav>
    )
  }

  return (
    <nav className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
      <div className="flex gap-4">
        <Link
          to="/perfil"
          className="text-sm font-medium text-gray-700 hover:text-blue-600"
          activeProps={{ className: 'text-blue-600' }}
        >
          Perfil
        </Link>
        {usuario.ingresadoEn && (
          <>
            <Link
              to="/problemas"
              className="text-sm font-medium text-gray-700 hover:text-blue-600"
              activeProps={{ className: 'text-blue-600' }}
            >
              Problemas
            </Link>
            <Link
              to="/clasificacion"
              className="text-sm font-medium text-gray-700 hover:text-blue-600"
              activeProps={{ className: 'text-blue-600' }}
            >
              Clasificación
            </Link>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{usuario.name}</span>
        <button className="text-sm text-red-600 underline" onClick={() => cerrarSesion()}>
          Cerrar sesión
        </button>
      </div>
    </nav>
  )
}
