import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'
import { useAdminActiveLinkClass } from '#/components/useAdminActiveLinkClass'
import { UserMenu } from '#/components/UserMenu'
import { AdminRingStripe } from '#/components/AdminRingStripe'
import { AdminSealMark } from '#/components/AdminSealMark'
import {
  ADMIN_NAV_USER_NAME,
  ADMIN_NAV_LOGOUT,
} from '#/components/adminBrandStyles'

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
  const claseEnlace = useAdminActiveLinkClass()

  return (
    <div className="sticky top-0 z-10">
      <AdminRingStripe />
      <nav className="border-b border-admin-line bg-admin-paper-raised shadow-sm shadow-black/5">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 py-2.5">
          <div className="flex items-center gap-3">
            <AdminSealMark className="h-7 w-7" />
            <span className="font-admin-display text-sm font-bold text-admin-ink">
              Panel administrativo
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
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
          <UserMenu
            nombre={usuario?.name}
            nombreClassName={ADMIN_NAV_USER_NAME}
            logoutClassName={ADMIN_NAV_LOGOUT}
          />
        </div>
      </nav>
    </div>
  )
}
