import type { BeneficioUsadoItem } from '#/server/standings/beneficiosUsadosDatos'
import type { Categoria } from '#/shared/dominio'
import { CATALOGO_BENEFICIOS } from '#/shared/beneficios'
import { CARD_TERMINAL, PANEL_TITLE_TERMINAL } from '#/components/brandStyles'

export function BeneficiosUsadosPanel({
  items,
  categoriasActivas,
}: {
  items: BeneficioUsadoItem[]
  categoriasActivas: Set<Categoria>
}) {
  const filtrados = items.filter((i) =>
    categoriasActivas.has(i.usuarioCategoria),
  )

  return (
    <div className={`${CARD_TERMINAL} p-4`}>
      <h3 className={PANEL_TITLE_TERMINAL}>Ventajas / desventajas</h3>
      <ul className="mt-3 flex flex-col gap-2 text-[13px] text-ink-soft">
        {filtrados.map((item) => {
          const definicion = CATALOGO_BENEFICIOS[item.clave]
          const objetivo = item.objetivoUsuarioNombre ?? item.objetivoIngeniero
          return (
            <li key={item.usuarioId}>
              <span className="font-semibold text-ink">
                {item.usuarioNombre}
              </span>{' '}
              — {definicion.texto}
              {item.usadoEn ? (
                <span className="text-[oklch(78%_0.14_152)]">
                  {' '}
                  · usada{objetivo ? ` contra ${objetivo}` : ''}
                </span>
              ) : (
                <span className="text-ink-faint"> · sin usar</span>
              )}
            </li>
          )
        })}
        {filtrados.length === 0 && (
          <li className="text-ink-faint">
            Nadie tiene beneficio asignado todavía.
          </li>
        )}
      </ul>
    </div>
  )
}
