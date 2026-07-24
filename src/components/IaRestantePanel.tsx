import type { CupoIaItem } from '#/server/standings/beneficiosUsadosDatos'
import { PanelTablero } from '#/components/PanelTablero'
import { ROW_ACCENT_AMBAR } from '#/components/brandStyles'

export function IaRestantePanel({ items }: { items: CupoIaItem[] }) {
  return (
    <PanelTablero titulo="Preguntas de IA restantes">
      <ul className="mt-3 flex flex-col gap-1.5 text-[13px] text-ink">
        {items.map((item) => (
          <li
            key={item.usuarioId}
            className={`flex items-center justify-between gap-3 ${ROW_ACCENT_AMBAR}`}
          >
            <span className="text-ink">{item.usuarioNombre}</span>
            <span className="font-mono font-bold text-laurel-ink">
              {item.preguntasRestantes}
            </span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-ink-faint">No hay participantes invitados.</li>
        )}
      </ul>
    </PanelTablero>
  )
}
