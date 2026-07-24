import type { ActividadRecienteItem } from '#/server/standings/actividadRecienteDatos'
import type { Categoria } from '#/shared/dominio'
import { PanelTablero } from '#/components/PanelTablero'
import { LogroBanner } from '#/components/LogroBanner'

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
    <PanelTablero titulo="Actividad reciente">
      <div className="mt-3 flex flex-col gap-1">
        {filtrados.map((item, i) => (
          <LogroBanner key={`${item.usuarioId}-${i}`} tono="neutro">
            {item.usuarioNombre} resolvió {item.problemaTitulo}{' '}
            <span className="text-[10px] opacity-70">
              ({tiempoRelativo(new Date(item.creadoEn), ahora)})
            </span>
          </LogroBanner>
        ))}
        {filtrados.length === 0 && (
          <p className="text-center text-[13px] text-ink-faint">
            Todavía no hay actividad.
          </p>
        )}
      </div>
    </PanelTablero>
  )
}
