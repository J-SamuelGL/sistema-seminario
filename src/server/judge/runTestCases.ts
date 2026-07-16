import { generarPrograma } from './harness'
import { serializarCanonico, compararSalidas } from './serializar'
import { separarSalidaConsola } from './consola'
import { ejecutarPiston } from '../piston/client'
import { determinarVeredicto } from './verdict'
import type { ResultadoCaso, Veredicto } from './verdict'
import type { Parametro, TipoDato, Valor } from './tipos'

export type CasoPrueba = {
  argumentos: Valor[]
  salidaEsperada: Valor
  visible: boolean
}

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
  const resultados = await Promise.all(
    casosPrueba.map(async (casoPrueba) => {
      const { archivo, contenido } = generarPrograma(
        lenguaje,
        codigo,
        firma.nombreFuncion,
        firma.parametros,
        firma.tipoRetorno,
        casoPrueba.argumentos,
      )
      const salida = await ejecutarPiston(lenguaje, archivo, contenido)
      const { salidaConsola, salidaResultado } = separarSalidaConsola(
        salida.salidaEstandar,
      )
      const salidaEsperadaTexto = serializarCanonico(
        casoPrueba.salidaEsperada,
        firma.tipoRetorno,
      )
      const resultado: ResultadoCaso = {
        visible: casoPrueba.visible,
        argumentos: casoPrueba.argumentos,
        salidaEsperada: salidaEsperadaTexto,
        salidaObtenida: salidaResultado,
        salidaConsola,
        aprobado: compararSalidas(
          salidaResultado,
          salidaEsperadaTexto,
          firma.tipoRetorno,
        ),
        salidaError: salida.salidaError,
        tiempoExcedido: salida.tiempoExcedido,
        codigoSalida: salida.codigoSalida,
      }
      return resultado
    }),
  )

  return { resultados, veredicto: determinarVeredicto(resultados) }
}
