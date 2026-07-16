import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { verifyPassword } from 'better-auth/crypto'
import { db } from '../src/server/db/client'
import { cuentas } from '../src/server/db/schema'
import { crearCuentaParticipante } from '../src/server/participantes/crear'

describe('crearCuentaParticipante', () => {
  it('crea el usuario y una cuenta credential con la contraseña generada', async () => {
    const correo = `test-${crypto.randomUUID()}@example.com`
    const { id, contrasenaGenerada } = await crearCuentaParticipante({
      nombre: 'Ana',
      correo,
      categoria: 'invitado',
      carnet: '22-1234-2020',
      semestre: null,
    })

    const filasCuenta = await db
      .select()
      .from(cuentas)
      .where(eq(cuentas.userId, id))
    const cuenta = filasCuenta.length > 0 ? filasCuenta[0] : null
    expect(cuenta?.providerId).toBe('credential')
    expect(cuenta?.password).toBeTruthy()
    expect(
      await verifyPassword({
        hash: cuenta!.password!,
        password: contrasenaGenerada,
      }),
    ).toBe(true)
  })

  it('rechaza un correo que ya está registrado', async () => {
    const correo = `dup-${crypto.randomUUID()}@example.com`
    await crearCuentaParticipante({
      nombre: 'Ana',
      correo,
      categoria: 'invitado',
      carnet: null,
    })
    await expect(
      crearCuentaParticipante({
        nombre: 'Ana 2',
        correo,
        categoria: 'junior',
        carnet: null,
      }),
    ).rejects.toThrow('Ya existe una cuenta con ese correo')
  })
})
