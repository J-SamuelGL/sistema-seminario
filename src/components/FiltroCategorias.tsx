import { CATEGORIAS } from '#/shared/dominio'
import type { Categoria } from '#/shared/dominio'
import {
  PILL_FILTRO_ACTIVA,
  PILL_FILTRO_INACTIVA,
} from '#/components/brandStyles'

const ETIQUETAS: Record<Categoria, string> = {
  invitado: 'Invitados',
  junior: 'Junior',
  senior: 'Senior',
}

export function FiltroCategorias({
  activa,
  onSeleccionar,
}: {
  activa: Categoria
  onSeleccionar: (categoria: Categoria) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIAS.map((categoria) => (
        <button
          key={categoria}
          type="button"
          onClick={() => onSeleccionar(categoria)}
          className={
            activa === categoria ? PILL_FILTRO_ACTIVA : PILL_FILTRO_INACTIVA
          }
        >
          {ETIQUETAS[categoria]}
        </button>
      ))}
    </div>
  )
}
