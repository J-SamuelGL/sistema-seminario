import type { ReactNode } from 'react'
import { CornerFrame } from '#/components/CornerFrame'
import {
  CARD_TABLERO,
  PANEL_TITLE_TABLERO_EPICO,
  PANEL_TITLE_RULE_TABLERO,
} from '#/components/brandStyles'

/** Envoltorio compartido de los paneles secundarios del tablero público
 * (actividad reciente, ventajas/desventajas, etc.): mismas esquinas tipo
 * "objetivo" que ya usan el emblema del hero y el editor de código
 * (`CornerFrame`), más un filete dorado bajo el título — para que los seis
 * paneles lean como piezas de un mismo panel de estado, no como cajas
 * sueltas. Centralizar el tratamiento acá evita repetirlo en cada panel. */
export function PanelTablero({
  titulo,
  children,
}: {
  titulo: string
  children: ReactNode
}) {
  return (
    <CornerFrame className="p-1" borderClassName="border-brass-1/70">
      <div className={`${CARD_TABLERO} p-4`}>
        <h3 className={PANEL_TITLE_TABLERO_EPICO}>{titulo}</h3>
        <span className={PANEL_TITLE_RULE_TABLERO} />
        {children}
      </div>
    </CornerFrame>
  )
}
