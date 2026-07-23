import { z } from 'zod'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { db } from '../db/client'
import { obtenerUnaFila } from '../db/uno'
import { beneficios, usuarios } from '../db/schema'
import { idSchema } from '../validacion/comun'
import {
  CATALOGO_BENEFICIOS,
  CLAVES_DESVENTAJA,
  INGENIEROS,
} from '../../shared/beneficios'

export const registrarUsoBeneficioSchema = z.object({
  usuarioId: idSchema,
  objetivoUsuarioId: idSchema.nullable().optional(),
  objetivoIngeniero: z.enum(INGENIEROS).nullable().optional(),
})
export type RegistrarUsoBeneficio = z.infer<typeof registrarUsoBeneficioSchema>

/**
 * Registra (o corrige) el uso de la ventaja/desventaja de un participante.
 * Valida que el tipo de objetivo enviado coincida con lo que pide la clave
 * asignada, y que un participante no sea objetivo de más de una desventaja
 * (la aplicación real es fuera del sistema; esto solo lo registra).
 */
export async function aplicarUsoBeneficio(
  input: RegistrarUsoBeneficio,
): Promise<void> {
  const beneficio = await obtenerUnaFila(
    db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, input.usuarioId)),
  )
  if (!beneficio) {
    throw new Error('Este participante no tiene un beneficio asignado')
  }

  const definicion = CATALOGO_BENEFICIOS[beneficio.clave]
  const objetivoUsuarioId = input.objetivoUsuarioId ?? null
  const objetivoIngeniero = input.objetivoIngeniero ?? null

  if (definicion.tipoObjetivo === 'ninguno') {
    if (objetivoUsuarioId || objetivoIngeniero) {
      throw new Error('Este beneficio no admite objetivo')
    }
  } else if (definicion.tipoObjetivo === 'ingeniero') {
    if (!objetivoIngeniero) {
      throw new Error('Debes seleccionar un ingeniero')
    }
  } else {
    if (!objetivoUsuarioId) {
      throw new Error('Debes seleccionar un participante objetivo')
    }
    if (objetivoUsuarioId === input.usuarioId) {
      throw new Error('El objetivo no puede ser el mismo participante')
    }
    const objetivo = await obtenerUnaFila(
      db.select().from(usuarios).where(eq(usuarios.id, objetivoUsuarioId)),
    )
    if (!objetivo) {
      throw new Error('Participante objetivo no encontrado')
    }

    if ((CLAVES_DESVENTAJA as readonly string[]).includes(beneficio.clave)) {
      const yaFueObjetivo = await db
        .select({ id: beneficios.id })
        .from(beneficios)
        .where(
          and(
            eq(beneficios.objetivoUsuarioId, objetivoUsuarioId),
            inArray(beneficios.clave, CLAVES_DESVENTAJA),
            ne(beneficios.id, beneficio.id),
          ),
        )
      if (yaFueObjetivo.length > 0) {
        throw new Error('Ese participante ya fue objetivo de otra desventaja')
      }
    }
  }

  await db
    .update(beneficios)
    .set({ usadoEn: new Date(), objetivoUsuarioId, objetivoIngeniero })
    .where(eq(beneficios.id, beneficio.id))
}
