import { z } from 'zod'
import { idSchema, textoRequerido } from '../validacion/comun'
import { LENGUAJES } from '../../shared/dominio'

export const lenguajeSchema = z.enum(LENGUAJES)
export type LenguajeProgramacion = z.infer<typeof lenguajeSchema>

// envios.codigo es text
export const datosEjecucionSchema = z.object({
  problemaId: idSchema,
  lenguaje: lenguajeSchema,
  codigo: textoRequerido('El código es requerido'),
})

export type DatosEjecucion = z.infer<typeof datosEjecucionSchema>
