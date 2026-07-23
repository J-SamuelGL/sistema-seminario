import type { CupoIaItem } from '#/server/standings/beneficiosUsadosDatos'
import { CARD_TERMINAL, PANEL_TITLE_TERMINAL } from '#/components/brandStyles'

export function IaRestantePanel({ items }: { items: CupoIaItem[] }) {
  return (
    <div className={`${CARD_TERMINAL} p-4`}>
      <h3 className={PANEL_TITLE_TERMINAL}>Preguntas de IA restantes</h3>
      <ul className="mt-3 flex flex-col gap-1.5 text-[13px] text-ink-soft">
        {items.map((item) => (
          <li
            key={item.usuarioId}
            className="flex items-center justify-between gap-3"
          >
            <span className="text-ink">{item.usuarioNombre}</span>
            <span className="font-mono font-bold text-[oklch(78%_0.14_152)]">
              {item.preguntasRestantes}
            </span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-ink-faint">No hay participantes invitados.</li>
        )}
      </ul>
    </div>
  )
}
