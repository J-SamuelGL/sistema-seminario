import type { Valor } from './tipos'
import type { Veredicto } from '#/shared/dominio'

export type { Veredicto }

export type ResultadoCaso = {
  visible: boolean
  argumentos: Valor[]
  salidaEsperada: string
  salidaObtenida: string
  salidaConsola: string
  aprobado: boolean
  salidaError: string
  tiempoExcedido: boolean
  codigoSalida: number
}

export function determinarVeredicto(resultados: ResultadoCaso[]): Veredicto {
  if (resultados.length === 0) return 'error_ejecucion'
  if (resultados.some((r) => r.tiempoExcedido)) return 'tiempo_excedido'
  if (resultados.some((r) => r.codigoSalida !== 0)) return 'error_ejecucion'
  return resultados.every((r) => r.aprobado)
    ? 'aceptado'
    : 'respuesta_incorrecta'
}
