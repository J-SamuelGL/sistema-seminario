// src/components/ActividadEnVivoPanel.tsx
import type { ActividadEnVivo } from '#/server/standings/actividadEnVivo'
import type { Categoria } from '#/shared/dominio'
import { PanelTablero } from '#/components/PanelTablero'
import { ROW_ACCENT_LAUREL } from '#/components/brandStyles'

export function ActividadEnVivoPanel({
  items,
  categoriasActivas,
}: {
  items: ActividadEnVivo[]
  categoriasActivas: Set<Categoria>
}) {
  const filtrados = items.filter((i) =>
    categoriasActivas.has(i.usuarioCategoria),
  )

  return (
    <PanelTablero titulo="Quién resuelve qué">
      <ul className="mt-3 flex flex-col gap-1.5 text-[13px] text-ink">
        {filtrados.map((item) => (
          <li
            key={item.usuarioId}
            className={`flex items-center justify-between gap-3 ${ROW_ACCENT_LAUREL}`}
          >
            <span className="text-ink">{item.usuarioNombre}</span>
            <span className="text-laurel-ink">{item.problemaTitulo}</span>
          </li>
        ))}
        {filtrados.length === 0 && (
          <li className="text-ink-faint">
            Nadie con actividad en los últimos 10 minutos.
          </li>
        )}
      </ul>
    </PanelTablero>
  )
}
