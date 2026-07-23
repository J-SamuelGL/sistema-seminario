import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'
import { useActiveLinkClass } from '#/components/useActiveLinkClass'
import { UserMenu } from '#/components/UserMenu'
import { GRADIENT_TEXT, NAV_LINK_CARET } from '#/components/brandStyles'

export function NavbarParticipante() {
  const { data: usuario } = useSuspenseQuery(
    usuarioActualOpcionalQueryOptions(),
  )
  const claseEnlace = useActiveLinkClass()
  const perfil = claseEnlace('/perfil')
  const problemas = claseEnlace('/problemas')
  const clasificacion = claseEnlace('/clasificacion')

  if (!usuario) {
    return (
      <nav className="border-b border-line/50 bg-paper-soft px-6 py-3">
        <span className={`font-display text-sm font-bold ${GRADIENT_TEXT}`}>
          CodeFest 2026
        </span>
      </nav>
    )
  }

  return (
    <nav className="sticky top-0 z-10 border-b border-line/50 bg-paper-soft shadow-sm shadow-black/5">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-6 py-2.5">
        <div className="flex items-center gap-3">
          <img
            src="/logo-mark.png"
            alt=""
            className="h-12 w-12 rounded-full border border-gold-soft bg-paper-soft object-contain p-1.5"
          />
          <span className={`font-display text-sm font-bold ${GRADIENT_TEXT}`}>
            CodeFest 2026
          </span>
        </div>
        <div className="flex gap-7 pb-2">
          <Link to="/perfil" className={perfil.className}>
            Perfil
            {perfil.activo && <span className={NAV_LINK_CARET} />}
          </Link>
          {usuario.ingresadoEn && (
            <Link to="/problemas" className={problemas.className}>
              Problemas
              {problemas.activo && <span className={NAV_LINK_CARET} />}
            </Link>
          )}
          <Link to="/clasificacion" className={clasificacion.className}>
            Clasificación
            {clasificacion.activo && <span className={NAV_LINK_CARET} />}
          </Link>
        </div>
        <UserMenu nombre={usuario.name} />
      </div>
    </nav>
  )
}
