import { eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { db } from '../db/client'
import { usuarios, cuentas } from '../db/schema'
import { generarContrasenaAleatoria } from '../auth/password'

export async function crearCuentaParticipante(input: {
  nombre: string
  correo: string
  categoria: 'invitado' | 'junior' | 'senior'
  carnet: string | null
  rol?: 'participante' | 'admin'
}): Promise<{ id: string; contrasenaGenerada: string }> {
  const existentes = await db.select().from(usuarios).where(eq(usuarios.email, input.correo))
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
      rol: input.rol ?? 'participante',
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
