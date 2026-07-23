import type { FilaClasificacion } from '#/server/standings/calculate'
import {
  CARD,
  GRADIENT_TEXT,
  PILL_BASE,
  ROW_ACTIVE_GRADIENT,
} from '#/components/brandStyles'
import { BrandDivider } from '#/components/BrandDivider'

const GRID_COLS =
  'grid-cols-[48px_1fr_88px_72px] sm:grid-cols-[56px_1fr_100px_90px_84px]'

function claseInsignia(rank: number) {
  if (rank === 1)
    return 'bg-gradient-to-b from-brass-1 to-brass-2 text-[oklch(20%_0.02_70)] border-transparent'
  if (rank === 2)
    return 'bg-[oklch(85%_0.008_90)] text-[oklch(20%_0.01_90)] border-transparent'
  if (rank === 3)
    return 'bg-[oklch(68%_0.08_55)] text-[oklch(20%_0.02_50)] border-transparent'
  return 'bg-transparent text-ink-faint border-line'
}

export function LeaderboardTable({
  title,
  rows,
  usuarioActualId,
}: {
  title: string
  rows: Array<FilaClasificacion>
  usuarioActualId?: string
}) {
  return (
    <div>
      <h2
        className={`font-display text-lg font-bold uppercase ${GRADIENT_TEXT}`}
      >
        {title}
      </h2>
      <div className="mt-2 mb-4">
        <BrandDivider />
      </div>
      <div className={`${CARD} overflow-hidden`}>
        <div
          className={`grid ${GRID_COLS} border-b border-line/40 bg-paper-soft px-4 py-2.5 text-[11px] font-bold tracking-wide text-gold-label uppercase`}
        >
          <div>#</div>
          <div>Nombre</div>
          <div>Puntos</div>
          <div className="hidden sm:block">Resueltos</div>
          <div>Tiempo</div>
        </div>
        {rows.map((row, i) => {
          const rank = i + 1
          const esYo = row.usuarioId === usuarioActualId
          return (
            <div
              key={row.usuarioId}
              className={`grid ${GRID_COLS} items-center border-b border-line/25 px-4 py-3 text-sm transition-colors last:border-b-0 ${
                esYo
                  ? `${ROW_ACTIVE_GRADIENT} shadow-[inset_1px_0_0_0_var(--color-laurel),inset_0_1px_0_0_color-mix(in_oklch,var(--color-laurel)_40%,transparent),inset_0_-1px_0_0_color-mix(in_oklch,var(--color-laurel)_40%,transparent)] hover:bg-[linear-gradient(90deg,color-mix(in_oklch,var(--color-laurel-soft)_100%,transparent)_0%,color-mix(in_oklch,var(--color-laurel-soft)_25%,transparent)_80%)]`
                  : 'hover:bg-[linear-gradient(90deg,color-mix(in_oklch,var(--color-laurel-soft)_75%,transparent)_0%,transparent_62%)]'
              }`}
            >
              <div>
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full border font-display text-[13px] font-bold ${claseInsignia(rank)}`}
                >
                  {rank}
                </span>
              </div>
              <div className="flex items-center gap-2 font-medium text-ink">
                {row.nombre}
                {esYo && (
                  <span
                    className={`${PILL_BASE} bg-laurel-soft text-laurel-ink`}
                  >
                    Tú
                  </span>
                )}
              </div>
              <div className="font-mono font-bold text-gold-label">
                {row.puntosTotales}
              </div>
              <div className="hidden font-mono text-ink-soft sm:block">
                {row.cantidadResueltos}
              </div>
              <div className="font-mono text-ink-soft">
                {Math.round(row.minutosPenalizacionTotal)} min
              </div>
            </div>
          )
        })}
        {rows.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-ink-faint">
            Aún no hay participantes en esta categoría.
          </div>
        )}
      </div>
    </div>
  )
}
