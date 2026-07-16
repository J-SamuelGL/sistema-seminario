import { z } from 'zod'
import { emailSchema, textoRequerido } from '../validacion/comun'

export const datosAdministradorSchema = z.object({
  nombre: textoRequerido('El nombre es requerido'),
  correo: emailSchema,
})

export type DatosAdministrador = z.infer<typeof datosAdministradorSchema>
