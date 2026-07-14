export type ResultadoCaso = {
  entrada: string
  salidaEsperada: string
  salidaObtenida: string
  aprobado: boolean
  salidaError: string
  tiempoExcedido: boolean
  codigoSalida: number
}

export type Veredicto = 'aceptado' | 'respuesta_incorrecta' | 'error_ejecucion' | 'tiempo_excedido'

export function determinarVeredicto(resultados: ResultadoCaso[]): Veredicto {
  if (resultados.some((r) => r.tiempoExcedido)) return 'tiempo_excedido'
  if (resultados.some((r) => r.codigoSalida !== 0)) return 'error_ejecucion'
  return resultados.every((r) => r.aprobado) ? 'aceptado' : 'respuesta_incorrecta'
}
