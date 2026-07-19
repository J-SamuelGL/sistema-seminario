import { useCerrarSesion } from '#/components/useCerrarSesion'

/** Bloque de "nombre del usuario + cerrar sesión" compartido entre navbars. */
export function UserMenu({ nombre }: { nombre?: string }) {
  const cerrarSesion = useCerrarSesion()
  return (
    <div className="flex items-center gap-4">
      {nombre && <span className="text-sm text-gray-500">{nombre}</span>}
      <button
        className="text-sm text-red-600 underline"
        onClick={() => cerrarSesion()}
      >
        Cerrar sesión
      </button>
    </div>
  )
}
