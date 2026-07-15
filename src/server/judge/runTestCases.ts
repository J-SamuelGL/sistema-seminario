import { generarPrograma } from './harness'
import { serializarCanonico, compararSalidas } from './serializar'
import { ejecutarPiston } from '../piston/client'
import { determinarVeredicto } from './verdict'
import type { ResultadoCaso, Veredicto } from './verdict'
import type { Parametro, TipoDato, Valor } from './tipos'

export type CasoPrueba = { argumentos: Valor[]; salidaEsperada: Valor; visible: boolean }

export type Firma = {
  nombreFuncion: string
  parametros: Parametro[]
  tipoRetorno: TipoDato
}

export async function ejecutarCasosPrueba(
  lenguaje: string,
  codigo: string,
  firma: Firma,
  casosPrueba: CasoPrueba[],
): Promise<{ resultados: ResultadoCaso[]; veredicto: Veredicto }> {
  const resultados: ResultadoCaso[] = []

  for (const casoPrueba of casosPrueba) {
    const { archivo, contenido } = generarPrograma(
      lenguaje,
      codigo,
      firma.nombreFuncion,
      firma.parametros,
      firma.tipoRetorno,
      casoPrueba.argumentos,
    )
    const salida = await ejecutarPiston(lenguaje, archivo, contenido)
    const salidaObtenida = salida.salidaEstandar.trim()
    const salidaEsperadaTexto = serializarCanonico(casoPrueba.salidaEsperada, firma.tipoRetorno)
    resultados.push({
      visible: casoPrueba.visible,
      argumentos: casoPrueba.argumentos,
      salidaEsperada: salidaEsperadaTexto,
      salidaObtenida,
      aprobado: compararSalidas(salidaObtenida, salidaEsperadaTexto, firma.tipoRetorno),
      salidaError: salida.salidaError,
      tiempoExcedido: salida.tiempoExcedido,
      codigoSalida: salida.codigoSalida,
    })
  }

  return { resultados, veredicto: determinarVeredicto(resultados) }
}
