import { ejecutarPiston } from '../piston/client'
import { determinarVeredicto } from './verdict'
import type { ResultadoCaso, Veredicto } from './verdict'

export type CasoPrueba = { entrada: string; salidaEsperada: string }

export async function ejecutarCasosPrueba(
  lenguaje: string,
  codigo: string,
  casosPrueba: CasoPrueba[],
): Promise<{ resultados: ResultadoCaso[]; veredicto: Veredicto }> {
  const resultados: ResultadoCaso[] = []

  for (const casoPrueba of casosPrueba) {
    const salida = await ejecutarPiston(lenguaje, codigo, casoPrueba.entrada)
    const salidaObtenida = salida.salidaEstandar.trim()
    resultados.push({
      entrada: casoPrueba.entrada,
      salidaEsperada: casoPrueba.salidaEsperada,
      salidaObtenida,
      aprobado: salidaObtenida === casoPrueba.salidaEsperada.trim(),
      salidaError: salida.salidaError,
      tiempoExcedido: salida.tiempoExcedido,
      codigoSalida: salida.codigoSalida,
    })
  }

  return { resultados, veredicto: determinarVeredicto(resultados) }
}
