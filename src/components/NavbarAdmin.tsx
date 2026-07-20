import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'
import { useActiveLinkClass } from '#/components/useActiveLinkClass'
import { UserMenu } from '#/components/UserMenu'

const ENLACES = [
  { to: '/admin/participantes', etiqueta: 'Participantes' },
  { to: '/admin/administradores', etiqueta: 'Administradores' },
  { to: '/admin/ingreso', etiqueta: 'Ingreso' },
  { to: '/admin/torneo', etiqueta: 'Torneo' },
  { to: '/admin/problemas', etiqueta: 'Problemas' },
  { to: '/admin/respuestas', etiqueta: 'Respuestas' },
  { to: '/admin/historial', etiqueta: 'Historial' },
  { to: '/clasificacion', etiqueta: 'Clasificación' },
] as const

export function NavbarAdmin() {
  const { data: usuario } = useSuspenseQuery(
    usuarioActualOpcionalQueryOptions(),
  )
  const claseEnlace = useActiveLinkClass()

  return (
    <nav className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
      <div className="flex gap-4">
        {ENLACES.map((enlace) => (
          <Link
            key={enlace.to}
            to={enlace.to}
            className={claseEnlace(enlace.to)}
          >
            {enlace.etiqueta}
          </Link>
        ))}
      </div>
      <UserMenu nombre={usuario?.name} />
    </nav>
  )
}
