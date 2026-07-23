import type { ReactNode } from 'react'
import { LOGRO_TEXT, LOGRO_LINE } from '#/components/brandStyles'

/** Aviso ceremonial tipo "logro desbloqueado" (referencia: los mensajes de
 * Elden Ring como "Great Enemy Felled") para hitos del participante:
 * problema resuelto, check-in confirmado. */
export function LogroBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-1">
      <span className={`${LOGRO_LINE} w-48 max-w-full`} />
      <span className={`${LOGRO_TEXT} px-2 text-center text-[13px]`}>
        {children}
      </span>
      <span className={`${LOGRO_LINE} w-48 max-w-full`} />
    </div>
  )
}
