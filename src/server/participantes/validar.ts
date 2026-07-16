import { z } from 'zod'
import { emailSchema, textoRequerido, TEXT_MAX } from '../validacion/comun'

export const categoriaSchema = z.enum(['invitado', 'junior', 'senior'])
export const semestreSchema = z.enum([
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
])

export type Categoria = z.infer<typeof categoriaSchema>
export type Semestre = z.infer<typeof semestreSchema>

export const datosParticipanteSchema = z
  .object({
    nombre: textoRequerido('El nombre es requerido'),
    correo: emailSchema,
    categoria: categoriaSchema,
    carnet: z.string().trim().max(TEXT_MAX).nullable(),
    semestre: semestreSchema.nullable(),
  })
  .transform((datos) => ({
    ...datos,
    carnet: datos.categoria === 'invitado' ? null : datos.carnet || null,
    semestre: datos.categoria === 'invitado' ? null : datos.semestre,
  }))
  .check((ctx) => {
    const datos = ctx.value
    if (datos.categoria === 'invitado') return
    if (!datos.carnet) {
      ctx.issues.push({
        code: 'custom',
        input: datos.carnet,
        path: ['carnet'],
        message: 'El carné es obligatorio para Junior y Senior.',
      })
    }
    if (!datos.semestre) {
      ctx.issues.push({
        code: 'custom',
        input: datos.semestre,
        path: ['semestre'],
        message: 'El semestre es obligatorio para Junior y Senior.',
      })
    }
  })

export type DatosParticipante = z.infer<typeof datosParticipanteSchema>
