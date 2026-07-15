import type { Valor } from './tipos'
import type { ResultadoCaso } from './verdict'

export type ResultadoCasoPublico =
  | {
      visible: true
      argumentos: Valor[]
      salidaEsperada: string
      salidaObtenida: string
      salidaConsola: string
      aprobado: boolean
      salidaError: string
    }
  | { visible: false; aprobado: boolean }

export function ocultarDetalleCasosNoVisibles(
  resultados: ResultadoCaso[],
): ResultadoCasoPublico[] {
  return resultados.map((r) =>
    r.visible
      ? {
          visible: true,
          argumentos: r.argumentos,
          salidaEsperada: r.salidaEsperada,
          salidaObtenida: r.salidaObtenida,
          salidaConsola: r.salidaConsola,
          aprobado: r.aprobado,
          salidaError: r.salidaError,
        }
      : { visible: false, aprobado: r.aprobado },
  )
}
