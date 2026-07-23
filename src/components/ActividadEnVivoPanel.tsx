// src/components/ActividadEnVivoPanel.tsx
import type { ActividadEnVivo } from '#/server/standings/actividadEnVivo'
import type { Categoria } from '#/shared/dominio'
import { CARD_TERMINAL, PANEL_TITLE_TERMINAL } from '#/components/brandStyles'

export function ActividadEnVivoPanel({
  items,
  categoriasActivas,
}: {
  items: ActividadEnVivo[]
  categoriasActivas: Set<Categoria>
}) {
  const filtrados = items.filter((i) => categoriasActivas.has(i.usuarioCategoria))

  return (
    <div className={`${CARD_TERMINAL} p-4`}>
      <h3 className={PANEL_TITLE_TERMINAL}>Quién resuelve qué</h3>
      <ul className="mt-3 flex flex-col gap-1.5 text-[13px] text-ink-soft">
        {filtrados.map((item) => (
          <li key={item.usuarioId} className="flex items-center justify-between gap-3">
            <span className="text-ink">{item.usuarioNombre}</span>
            <span className="text-[oklch(78%_0.14_152)]">{item.problemaTitulo}</span>
          </li>
        ))}
        {filtrados.length === 0 && (
          <li className="text-ink-faint">Nadie con actividad en los últimos 10 minutos.</li>
        )}
      </ul>
    </div>
  )
}
