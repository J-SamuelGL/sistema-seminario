import { valorCoincideConTipo } from '../judge/tipos'
import type { Parametro, TipoDato } from '../judge/tipos'

export type LenguajeProblema = { lenguaje: string; nombreFuncion: string; codigoInicial: string }
export type CasoPruebaProblema = { argumentos: unknown[]; salidaEsperada: unknown; visible: boolean }

export function validarDatosProblema(input: {
  titulo: string
  descripcion: string
  grupo: 'invitado_junior' | 'senior'
  puntos: number
  parametros: Parametro[]
  tipoRetorno: TipoDato
  lenguajes: LenguajeProblema[]
  casosPrueba: CasoPruebaProblema[]
}) {
  const errores: string[] = []
  if (!input.titulo.trim()) errores.push('El título es requerido')
  if (!input.descripcion.trim()) errores.push('La descripción es requerida')
  if (input.grupo !== 'invitado_junior' && input.grupo !== 'senior')
    errores.push('Debe indicar el grupo (invitado_junior o senior)')
  if (!Number.isInteger(input.puntos) || input.puntos <= 0)
    errores.push('Los puntos deben ser un entero positivo')

  if (input.lenguajes.length === 0) errores.push('Debe permitir al menos un lenguaje')
  for (const lenguaje of input.lenguajes) {
    if (!lenguaje.nombreFuncion.trim()) errores.push(`Falta el nombre de función para ${lenguaje.lenguaje}`)
    if (!lenguaje.codigoInicial.trim()) errores.push(`Falta el código inicial para ${lenguaje.lenguaje}`)
  }

  if (input.casosPrueba.length < 4) errores.push('Debe haber al menos 4 casos de prueba')

  for (const [i, caso] of input.casosPrueba.entries()) {
    if (caso.argumentos.length !== input.parametros.length) {
      errores.push(`El caso ${i + 1} no tiene la cantidad correcta de argumentos`)
      continue
    }
    const argumentosValidos = caso.argumentos.every((valor, j) =>
      valorCoincideConTipo(valor, input.parametros[j].tipo),
    )
    if (!argumentosValidos) errores.push(`El caso ${i + 1} tiene un argumento de tipo incorrecto`)
    if (!valorCoincideConTipo(caso.salidaEsperada, input.tipoRetorno)) {
      errores.push(`El caso ${i + 1} tiene una salida esperada de tipo incorrecto`)
    }
  }

  if (input.casosPrueba.length > 0) {
    const salidasUnicas = new Set(input.casosPrueba.map((c) => JSON.stringify(c.salidaEsperada)))
    if (salidasUnicas.size === 1) {
      errores.push('Todos los casos de prueba tienen la misma salida esperada — agrega variedad')
    }
    if (!input.casosPrueba.some((c) => c.visible)) {
      errores.push('Debe haber al menos un caso de prueba visible')
    }
    if (!input.casosPrueba.some((c) => !c.visible)) {
      errores.push('Debe haber al menos un caso de prueba oculto')
    }
  }

  return errores
}
