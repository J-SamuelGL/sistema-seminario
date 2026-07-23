import type { ActividadRecienteItem } from '#/server/standings/actividadRecienteDatos'
import type { Categoria } from '#/shared/dominio'
import { CARD_TERMINAL, PANEL_TITLE_TERMINAL } from '#/components/brandStyles'

export function tiempoRelativo(fecha: Date, ahora: Date): string {
  const segundos = Math.max(
    Math.floor((ahora.getTime() - fecha.getTime()) / 1000),
    0,
  )
  if (segundos < 60) return `hace ${segundos}s`
  const minutos = Math.floor(segundos / 60)
  if (minutos < 60) return `hace ${minutos}m`
  const horas = Math.floor(minutos / 60)
  return `hace ${horas}h`
}

export function ActividadRecienteFeed({
  items,
  categoriasActivas,
}: {
  items: ActividadRecienteItem[]
  categoriasActivas: Set<Categoria>
}) {
  const ahora = new Date()
  const filtrados = items.filter((i) =>
    categoriasActivas.has(i.usuarioCategoria),
  )

  return (
    <div className={`${CARD_TERMINAL} p-4`}>
      <h3 className={PANEL_TITLE_TERMINAL}>Actividad reciente</h3>
      <ul className="mt-3 flex flex-col gap-2 text-[13px] text-ink-soft">
        {filtrados.map((item, i) => (
          <li key={`${item.usuarioId}-${i}`}>
            <span className="font-semibold text-ink">{item.usuarioNombre}</span>{' '}
            resolvió{' '}
            <span className="text-[oklch(78%_0.14_152)]">
              {item.problemaTitulo}
            </span>{' '}
            <span className="text-ink-faint">
              ({tiempoRelativo(new Date(item.creadoEn), ahora)})
            </span>
          </li>
        ))}
        {filtrados.length === 0 && (
          <li className="text-ink-faint">Todavía no hay actividad.</li>
        )}
      </ul>
    </div>
  )
}
