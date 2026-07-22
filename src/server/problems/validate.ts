import { z } from 'zod'
import { valorCoincideConTipo } from '../judge/tipos'
import { idSchema, textoRequerido } from '../validacion/comun'
import {
  TIPOS_DATO,
  LENGUAJES,
  DIFICULTADES,
  CATEGORIAS_PROBLEMA,
  GRUPOS,
} from '../../shared/dominio'
import type { Parametro, TipoDato } from '../judge/tipos'
import type { Grupo } from '../../shared/dominio'

const tipoDatoSchema = z.enum(TIPOS_DATO)

const lenguajeProblemaSchema = z.object({
  lenguaje: z.enum(LENGUAJES),
  nombreFuncion: textoRequerido('Falta el nombre de función'),
  codigoInicial: textoRequerido('Falta el código inicial'),
})

const casoPruebaSchema = z.object({
  argumentos: z.array(z.any()),
  salidaEsperada: z.any(),
  visible: z.boolean(),
})

// Forma y longitudes básicas (coinciden con las columnas de `problemas`, todas `text`
// salvo `orden`/`puntos`, que son `int`). Las reglas de negocio que dependen de los tipos
// declarados en `parametros` (coincidencia de tipos, variedad de salidas, etc.) se validan
// aparte en `validarDatosProblema`, ya que no son expresables como un esquema estático.
export const datosProblemaSchema = z.object({
  titulo: textoRequerido('El título es requerido'),
  descripcion: textoRequerido('La descripción es requerida'),
  dificultad: z.enum(DIFICULTADES),
  categoriaProblema: z.enum(CATEGORIAS_PROBLEMA),
  orden: z.number().int(),
  grupo: z.enum(GRUPOS),
  puntos: z.number().int().positive(),
  parametros: z.array(
    z.object({
      nombre: textoRequerido('Falta el nombre del parámetro'),
      tipo: tipoDatoSchema,
    }),
  ),
  tipoRetorno: tipoDatoSchema,
  lenguajes: z.array(lenguajeProblemaSchema),
  casosPrueba: z.array(casoPruebaSchema),
})

export const datosProblemaConIdSchema = datosProblemaSchema.extend({
  id: idSchema,
})

export type LenguajeProblema = {
  lenguaje: string
  nombreFuncion: string
  codigoInicial: string
}
export type CasoPruebaProblema = {
  argumentos: unknown[]
  salidaEsperada: unknown
  visible: boolean
}

export function validarDatosProblema(input: {
  titulo: string
  descripcion: string
  grupo: Grupo
  puntos: number
  parametros: Parametro[]
  tipoRetorno: TipoDato
  lenguajes: LenguajeProblema[]
  casosPrueba: CasoPruebaProblema[]
}) {
  const errores: string[] = []
  if (!input.titulo.trim()) errores.push('El título es requerido')
  if (!input.descripcion.trim()) errores.push('La descripción es requerida')
  // Validación en runtime: aunque el tipo diga `Grupo`, este validador también
  // se ejerce con entradas fuera del tipo (ver test con `grupo: '' as never`).
  if (!(GRUPOS as readonly string[]).includes(input.grupo))
    errores.push('Debe indicar el grupo (invitado_junior o senior)')
  if (!Number.isInteger(input.puntos) || input.puntos <= 0)
    errores.push('Los puntos deben ser un entero positivo')

  if (input.lenguajes.length === 0)
    errores.push('Debe permitir al menos un lenguaje')
  for (const lenguaje of input.lenguajes) {
    if (!lenguaje.nombreFuncion.trim())
      errores.push(`Falta el nombre de función para ${lenguaje.lenguaje}`)
    if (!lenguaje.codigoInicial.trim())
      errores.push(`Falta el código inicial para ${lenguaje.lenguaje}`)
  }

  if (input.casosPrueba.length < 4)
    errores.push('Debe haber al menos 4 casos de prueba')

  for (const [i, caso] of input.casosPrueba.entries()) {
    if (caso.argumentos.length !== input.parametros.length) {
      errores.push(
        `El caso ${i + 1} no tiene la cantidad correcta de argumentos`,
      )
      continue
    }
    const argumentosValidos = caso.argumentos.every((valor, j) =>
      valorCoincideConTipo(valor, input.parametros[j].tipo),
    )
    if (!argumentosValidos)
      errores.push(`El caso ${i + 1} tiene un argumento de tipo incorrecto`)
    if (!valorCoincideConTipo(caso.salidaEsperada, input.tipoRetorno)) {
      errores.push(
        `El caso ${i + 1} tiene una salida esperada de tipo incorrecto`,
      )
    }
  }

  if (input.casosPrueba.length > 0) {
    const salidasUnicas = new Set(
      input.casosPrueba.map((c) => JSON.stringify(c.salidaEsperada)),
    )
    if (salidasUnicas.size === 1) {
      errores.push(
        'Todos los casos de prueba tienen la misma salida esperada — agrega variedad',
      )
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
