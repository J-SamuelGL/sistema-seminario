import type { FilaClasificacion } from '#/server/standings/calculate'
import { CARD_TERMINAL, PANEL_TITLE_TERMINAL } from '#/components/brandStyles'

const GRID_COLS =
  'grid-cols-[48px_1fr_88px_72px] sm:grid-cols-[56px_1fr_100px_90px_84px]'

function claseInsignia(rank: number) {
  if (rank === 1)
    return 'bg-gradient-to-b from-brass-1 to-brass-2 text-[oklch(20%_0.02_70)] border-transparent'
  if (rank === 2)
    return 'bg-[oklch(85%_0.008_90)] text-[oklch(20%_0.01_90)] border-transparent'
  if (rank === 3)
    return 'bg-[oklch(68%_0.08_55)] text-[oklch(20%_0.02_50)] border-transparent'
  return 'bg-transparent text-[oklch(55%_0.01_150)] border-[oklch(35%_0.02_150/0.6)]'
}

function brechaConLider(row: FilaClasificacion, lider: FilaClasificacion): string | null {
  if (row.usuarioId === lider.usuarioId) return null
  const puntos = row.puntosTotales - lider.puntosTotales
  const minutos = Math.round(row.minutosPenalizacionTotal - lider.minutosPenalizacionTotal)
  const signoMinutos = minutos >= 0 ? '+' : ''
  return `${puntos} pts / ${signoMinutos}${minutos} min vs. líder`
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
  const lider = rows[0]

  return (
    <div className={`${CARD_TERMINAL} overflow-hidden`}>
      <h2 className={`${PANEL_TITLE_TERMINAL} px-4 pt-4 text-[15px]`}>{title}</h2>
      <div
        className={`mt-3 grid ${GRID_COLS} border-y border-[oklch(30%_0.02_150/0.5)] bg-[oklch(12%_0.02_150)] px-4 py-2.5 text-[11px] font-bold tracking-wide text-[oklch(60%_0.1_85)] uppercase`}
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
            className={`grid ${GRID_COLS} items-center border-b border-[oklch(25%_0.02_150/0.5)] px-4 py-3 text-sm last:border-b-0 ${
              esYo ? 'bg-[oklch(16%_0.04_152/0.5)]' : ''
            }`}
          >
            <div>
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full border font-display text-[13px] font-bold ${claseInsignia(rank)}`}
              >
                {rank}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="flex items-center gap-2 font-medium text-[oklch(88%_0.01_150)]">
                {row.nombre}
                {esYo && (
                  <span className="rounded-sm bg-[oklch(20%_0.05_152)] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[oklch(78%_0.14_152)] uppercase">
                    Tú
                  </span>
                )}
              </span>
              {lider && (
                <span className="text-[11px] text-[oklch(55%_0.02_150)]">
                  {brechaConLider(row, lider)}
                </span>
              )}
            </div>
            <div className="font-mono font-bold text-[oklch(78%_0.16_70)]">{row.puntosTotales}</div>
            <div className="hidden font-mono text-[oklch(65%_0.01_150)] sm:block">
              {row.cantidadResueltos}
            </div>
            <div className="font-mono text-[oklch(65%_0.01_150)]">
              {Math.round(row.minutosPenalizacionTotal)} min
            </div>
          </div>
        )
      })}
      {rows.length === 0 && (
        <div className="px-4 py-6 text-center text-sm text-[oklch(55%_0.02_150)]">
          Aún no hay participantes en esta categoría.
        </div>
      )}
    </div>
  )
}
