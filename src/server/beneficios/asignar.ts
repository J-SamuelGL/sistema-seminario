import { and, eq, isNull } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios, beneficios } from '../db/schema'
import { CLAVES_VENTAJA, CLAVES_DESVENTAJA } from '../../shared/beneficios'
import type { ClaveBeneficio } from '../../shared/beneficios'

function elegirAleatorio<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)]
}

/**
 * Asigna una ventaja (invitado/junior) o desventaja (senior) al azar a cada
 * participante del torneo que todavía no tenga una. Pensada para llamarse
 * una sola vez, desde `iniciarTorneo` — el filtro por "sin beneficio
 * todavía" la vuelve segura de llamar más de una vez sin duplicar filas.
 */
export async function asignarBeneficios(torneoId: string): Promise<void> {
  const sinBeneficio = await db
    .select({ id: usuarios.id, categoria: usuarios.categoria })
    .from(usuarios)
    .leftJoin(beneficios, eq(beneficios.usuarioId, usuarios.id))
    .where(
      and(
        eq(usuarios.torneoId, torneoId),
        eq(usuarios.rol, 'participante'),
        isNull(beneficios.id),
      ),
    )

  for (const usuario of sinBeneficio) {
    const clave: ClaveBeneficio =
      usuario.categoria === 'senior'
        ? elegirAleatorio(CLAVES_DESVENTAJA)
        : elegirAleatorio(CLAVES_VENTAJA)
    await db.insert(beneficios).values({ usuarioId: usuario.id, clave })
  }
}
