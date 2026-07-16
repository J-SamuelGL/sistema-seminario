import { z } from 'zod'
import { idSchema, textoRequerido } from '../validacion/comun'

export const datosPreguntaAsistenteSchema = z.object({
  problemaId: idSchema,
  pregunta: textoRequerido('La pregunta es requerida'),
})

export type DatosPreguntaAsistente = z.infer<
  typeof datosPreguntaAsistenteSchema
>
