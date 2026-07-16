import { z } from 'zod'
import { idSchema, textoRequerido } from '../validacion/comun'

export const lenguajeSchema = z.enum([
  'python',
  'javascript',
  'java',
  'csharp',
  'php',
])
export type LenguajeProgramacion = z.infer<typeof lenguajeSchema>

// envios.codigo es text
export const datosEjecucionSchema = z.object({
  problemaId: idSchema,
  lenguaje: lenguajeSchema,
  codigo: textoRequerido('El código es requerido'),
})

export type DatosEjecucion = z.infer<typeof datosEjecucionSchema>
