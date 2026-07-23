import { useCerrarSesion } from '#/components/useCerrarSesion'
import { NAV_USER_NAME, NAV_LOGOUT } from '#/components/brandStyles'

/** Bloque de "nombre del usuario + cerrar sesión" compartido entre navbars.
 * Las clases llegan por props (en vez de importar brandStyles/adminBrandStyles
 * aquí) para no atarse a una identidad visual: quien lo use decide cuál le
 * corresponde. Por defecto usa la identidad de participante, que es el caso
 * de uso más común. */
export function UserMenu({
  nombre,
  nombreClassName = NAV_USER_NAME,
  logoutClassName = NAV_LOGOUT,
}: {
  nombre?: string
  nombreClassName?: string
  logoutClassName?: string
}) {
  const cerrarSesion = useCerrarSesion()
  return (
    <div className="flex items-center gap-4">
      {nombre && <span className={nombreClassName}>{nombre}</span>}
      <button className={logoutClassName} onClick={() => cerrarSesion()}>
        Cerrar sesión
      </button>
    </div>
  )
}
