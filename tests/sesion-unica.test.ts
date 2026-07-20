import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '../src/server/db/client'
import { sesiones } from '../src/server/db/schema'
import { auth } from '../src/server/auth/auth'
import { crearCuentaParticipante } from '../src/server/participantes/crear'
import { cerrarTodasLasSesiones } from '../src/server/sesiones/activas'

async function iniciarSesion(correo: string, contrasena: string) {
  await auth.api.signInEmail({
    body: { email: correo, password: contrasena },
  })
}

async function sesionesDe(usuarioId: string) {
  return db.select().from(sesiones).where(eq(sesiones.userId, usuarioId))
}

describe('sesión única por participante al iniciar sesión', () => {
  it('un segundo login elimina la sesión anterior del participante', async () => {
    const correo = `unica-${crypto.randomUUID()}@example.com`
    const { id, contrasenaGenerada } = await crearCuentaParticipante({
      nombre: 'Participante Única',
      correo,
      categoria: 'junior',
      carnet: null,
    })

    await iniciarSesion(correo, contrasenaGenerada)
    await iniciarSesion(correo, contrasenaGenerada)

    expect(await sesionesDe(id)).toHaveLength(1)
  })

  it('un admin puede mantener varias sesiones a la vez', async () => {
    const correo = `admin-${crypto.randomUUID()}@example.com`
    const { id, contrasenaGenerada } = await crearCuentaParticipante({
      nombre: 'Admin Multisesión',
      correo,
      categoria: 'senior',
      carnet: null,
      rol: 'admin',
    })

    await iniciarSesion(correo, contrasenaGenerada)
    await iniciarSesion(correo, contrasenaGenerada)

    expect(await sesionesDe(id)).toHaveLength(2)
  })
})

describe('cerrarTodasLasSesiones', () => {
  it('elimina todas las sesiones del usuario', async () => {
    const correo = `todas-${crypto.randomUUID()}@example.com`
    const { id, contrasenaGenerada } = await crearCuentaParticipante({
      nombre: 'Participante Check-in',
      correo,
      categoria: 'invitado',
      carnet: null,
    })
    await iniciarSesion(correo, contrasenaGenerada)

    const cerradas = await cerrarTodasLasSesiones(id)

    expect(cerradas).toBe(1)
    expect(await sesionesDe(id)).toHaveLength(0)
  })
})
