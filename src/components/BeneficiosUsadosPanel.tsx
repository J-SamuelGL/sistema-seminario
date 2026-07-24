import type { BeneficioUsadoItem } from '#/server/standings/beneficiosUsadosDatos'
import type { Categoria } from '#/shared/dominio'
import { CATALOGO_BENEFICIOS } from '#/shared/beneficios'
import { PanelTablero } from '#/components/PanelTablero'
import { BeneficioIcono } from '#/components/BeneficioIcono'

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
    <PanelTablero titulo="Ventajas / desventajas">
      <ul className="mt-3 flex flex-col gap-3 text-[13px] text-ink-soft">
        {filtrados.map((item) => {
          const definicion = CATALOGO_BENEFICIOS[item.clave]
          const objetivo = item.objetivoUsuarioNombre ?? item.objetivoIngeniero
          return (
            <li key={item.usuarioId} className="flex items-center gap-3">
              <BeneficioIcono clave={item.clave} size="md" />
              <span>
                <span className="font-semibold text-ink">
                  {item.usuarioNombre}
                </span>{' '}
                — {definicion.texto}
                {item.usadoEn ? (
                  <span className="text-laurel-ink">
                    {' '}
                    · usada{objetivo ? ` contra ${objetivo}` : ''}
                  </span>
                ) : (
                  <span className="text-ink-faint"> · sin usar</span>
                )}
              </span>
            </li>
          )
        })}
        {filtrados.length === 0 && (
          <li className="text-ink-faint">
            Nadie tiene beneficio asignado todavía.
          </li>
        )}
      </ul>
    </PanelTablero>
  )
}
