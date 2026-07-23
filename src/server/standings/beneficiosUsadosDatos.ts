import { and, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/mysql-core'
import { db } from '../db/client'
import { usuarios, beneficios } from '../db/schema'
import { LIMITE_PREGUNTAS_IA } from '../assistant/limit'
import type { ClaveBeneficio, Ingeniero } from '../../shared/beneficios'
import type { Categoria } from '../../shared/dominio'

export type BeneficioUsadoItem = {
  usuarioId: string
  usuarioNombre: string
  usuarioCategoria: Categoria
  clave: ClaveBeneficio
  usadoEn: Date | null
  objetivoUsuarioNombre: string | null
  objetivoIngeniero: Ingeniero | null
}

export async function cargarBeneficiosUsados(torneoId: string): Promise<BeneficioUsadoItem[]> {
  const objetivoUsuario = alias(usuarios, 'objetivoUsuario')
  return db
    .select({
      usuarioId: beneficios.usuarioId,
      usuarioNombre: usuarios.name,
      usuarioCategoria: usuarios.categoria,
      clave: beneficios.clave,
      usadoEn: beneficios.usadoEn,
      objetivoUsuarioNombre: objetivoUsuario.name,
      objetivoIngeniero: beneficios.objetivoIngeniero,
    })
    .from(beneficios)
    .innerJoin(usuarios, eq(usuarios.id, beneficios.usuarioId))
    .leftJoin(objetivoUsuario, eq(objetivoUsuario.id, beneficios.objetivoUsuarioId))
    .where(eq(usuarios.torneoId, torneoId))
}

export type CupoIaItem = {
  usuarioId: string
  usuarioNombre: string
  preguntasRestantes: number
}

export async function cargarCupoIaRestante(torneoId: string): Promise<CupoIaItem[]> {
  const filas = await db
    .select({
      usuarioId: usuarios.id,
      usuarioNombre: usuarios.name,
      preguntasIaUsadas: usuarios.preguntasIaUsadas,
    })
    .from(usuarios)
    .where(
      and(
        eq(usuarios.torneoId, torneoId),
        eq(usuarios.categoria, 'invitado'),
        eq(usuarios.rol, 'participante'),
      ),
    )

  return filas.map((f) => ({
    usuarioId: f.usuarioId,
    usuarioNombre: f.usuarioNombre,
    preguntasRestantes: Math.max(LIMITE_PREGUNTAS_IA - f.preguntasIaUsadas, 0),
  }))
}
