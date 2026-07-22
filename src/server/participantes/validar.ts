import { z } from 'zod'
import { emailSchema, textoRequerido, TEXT_MAX } from '../validacion/comun'
import { CATEGORIAS, SEMESTRES } from '../../shared/dominio'
import type { Categoria, Semestre } from '../../shared/dominio'

export const categoriaSchema = z.enum(CATEGORIAS)
export const semestreSchema = z.enum(SEMESTRES)

export type { Categoria, Semestre }

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
