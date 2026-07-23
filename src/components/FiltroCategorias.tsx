import { CATEGORIAS } from '#/shared/dominio'
import type { Categoria } from '#/shared/dominio'
import { PILL_FILTRO_ACTIVA, PILL_FILTRO_INACTIVA } from '#/components/brandStyles'

const ETIQUETAS: Record<Categoria, string> = {
  invitado: 'Invitados',
  junior: 'Junior',
  senior: 'Senior',
}

export function FiltroCategorias({
  activas,
  onToggle,
}: {
  activas: Set<Categoria>
  onToggle: (categoria: Categoria) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIAS.map((categoria) => (
        <button
          key={categoria}
          type="button"
          onClick={() => onToggle(categoria)}
          className={activas.has(categoria) ? PILL_FILTRO_ACTIVA : PILL_FILTRO_INACTIVA}
        >
          {ETIQUETAS[categoria]}
        </button>
      ))}
    </div>
  )
}
