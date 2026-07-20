import { eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { db } from '../db/client'
import { usuarios, cuentas } from '../db/schema'
import { generarContrasenaAleatoria } from '../auth/password'
import type { Categoria, Semestre } from './validar'

export async function crearCuentaParticipante(input: {
  nombre: string
  correo: string
  categoria: Categoria
  carnet: string | null
  semestre?: Semestre | null
  rol?: 'participante' | 'admin'
  torneoId?: string | null
}): Promise<{ id: string; contrasenaGenerada: string }> {
  const existentes = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, input.correo))
  if (existentes.length > 0) {
    throw new Error('Ya existe una cuenta con ese correo')
  }

  const contrasenaGenerada = generarContrasenaAleatoria()
  const hash = await hashPassword(contrasenaGenerada)
  const id = crypto.randomUUID()

  await db.transaction(async (tx) => {
    await tx.insert(usuarios).values({
      id,
      name: input.nombre,
      email: input.correo,
      categoria: input.categoria,
      carnet: input.carnet,
      semestre: input.semestre ?? null,
      rol: input.rol ?? 'participante',
      torneoId: input.torneoId ?? null,
    })
    await tx.insert(cuentas).values({
      id: crypto.randomUUID(),
      userId: id,
      accountId: id,
      providerId: 'credential',
      password: hash,
    })
  })

  return { id, contrasenaGenerada }
}
