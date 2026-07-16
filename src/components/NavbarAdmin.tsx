import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'
import { useCerrarSesion } from './useCerrarSesion'

const ENLACES = [
  { to: '/admin/participantes', etiqueta: 'Participantes' },
  { to: '/admin/administradores', etiqueta: 'Administradores' },
  { to: '/admin/ingreso', etiqueta: 'Ingreso' },
  { to: '/admin/torneo', etiqueta: 'Torneo' },
  { to: '/admin/problemas', etiqueta: 'Problemas' },
  { to: '/admin/envios', etiqueta: 'Envíos' },
  { to: '/clasificacion', etiqueta: 'Clasificación' },
] as const

export function NavbarAdmin() {
  const { data: usuario } = useSuspenseQuery(usuarioActualOpcionalQueryOptions())
  const cerrarSesion = useCerrarSesion()

  return (
    <nav className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
      <div className="flex gap-4">
        {ENLACES.map((enlace) => (
          <Link
            key={enlace.to}
            to={enlace.to}
            className="text-sm font-medium text-gray-700 hover:text-blue-600"
            activeProps={{ className: 'text-blue-600' }}
          >
            {enlace.etiqueta}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-4">
        {usuario && <span className="text-sm text-gray-500">{usuario.name}</span>}
        <button className="text-sm text-red-600 underline" onClick={() => cerrarSesion()}>
          Cerrar sesión
        </button>
      </div>
    </nav>
  )
}
