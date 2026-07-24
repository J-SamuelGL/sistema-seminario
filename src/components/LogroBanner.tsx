import type { ReactNode } from 'react'
import {
  LOGRO_TEXT,
  LOGRO_TEXT_NEUTRO_OSCURO,
  LOGRO_LINE,
  LOGRO_LINE_NEUTRO,
} from '#/components/brandStyles'

/** Aviso ceremonial tipo "logro desbloqueado" (referencia: los mensajes de
 * Elden Ring como "Great Enemy Felled") para hitos del participante:
 * problema resuelto, check-in confirmado. `tono="neutro"` cambia el verde de
 * éxito por dorado, para hitos que no son un logro propio del participante
 * (p.ej. actividad de otros en el tablero público). */
export function LogroBanner({
  children,
  tono = 'exito',
}: {
  children: ReactNode
  tono?: 'exito' | 'neutro'
}) {
  const texto = tono === 'neutro' ? LOGRO_TEXT_NEUTRO_OSCURO : LOGRO_TEXT
  const linea = tono === 'neutro' ? LOGRO_LINE_NEUTRO : LOGRO_LINE
  // Franja negra tipo "Great Enemy Felled" solo en tono neutro: distingue el
  // banner del título/fondo claro del panel que lo contiene, en vez de
  // flotar directamente sobre el pergamino.
  const fondo = tono === 'neutro' ? 'rounded-sm bg-char py-2.5' : 'py-1'
  return (
    <div className={`flex flex-col items-center gap-1.5 ${fondo}`}>
      <span className={`${linea} w-48 max-w-full`} />
      <span className={`${texto} px-2 text-center text-[13px]`}>
        {children}
      </span>
      <span className={`${linea} w-48 max-w-full`} />
    </div>
  )
}
