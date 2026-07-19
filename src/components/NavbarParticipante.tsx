import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'
import { useActiveLinkClass } from '#/components/useActiveLinkClass'
import { UserMenu } from '#/components/UserMenu'

export function NavbarParticipante() {
  const { data: usuario } = useSuspenseQuery(
    usuarioActualOpcionalQueryOptions(),
  )
  const claseEnlace = useActiveLinkClass()

  if (!usuario) {
    return (
      <nav className="border-b bg-gray-50 px-4 py-2">
        <span className="text-sm font-medium text-gray-700">
          Torneo de Programación
        </span>
      </nav>
    )
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
      <UserMenu nombre={usuario.name} />
    </nav>
  )
}
