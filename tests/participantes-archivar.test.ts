import { describe, it, expect } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { db } from '../src/server/db/client'
import { torneos, usuarios, cuentas } from '../src/server/db/schema'
import { archivarParticipantesDeTorneo } from '../src/server/participantes/archivar'

describe('archivarParticipantesDeTorneo', () => {
  it('mangla el correo, guarda el original, e invalida la contraseña de los participantes de ese torneo', async () => {
    const torneoId = crypto.randomUUID()
    await db.insert(torneos).values({
      id: torneoId,
      anio: 4000 + Math.floor(Math.random() * 1000),
    })

    const usuarioId = crypto.randomUUID()
    const correoOriginal = `repite-${usuarioId}@example.com`
    await db.insert(usuarios).values({
      id: usuarioId,
      name: 'Ana',
      email: correoOriginal,
      categoria: 'senior',
      torneoId,
    })
    await db.insert(cuentas).values({
      id: crypto.randomUUID(),
      userId: usuarioId,
      accountId: usuarioId,
      providerId: 'credential',
      password: 'hash-original',
    })

    await archivarParticipantesDeTorneo(torneoId)

    const [usuario] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, usuarioId))
    expect(usuario.email).not.toBe(correoOriginal)
    expect(usuario.email).toContain('@torneo.invalid')
    expect(usuario.correoOriginal).toBe(correoOriginal)

    const [cuenta] = await db
      .select()
      .from(cuentas)
      .where(
        and(eq(cuentas.userId, usuarioId), eq(cuentas.providerId, 'credential')),
      )
    expect(cuenta.password).toBeNull()
  })

  it('no toca administradores (torneoId null)', async () => {
    const torneoId = crypto.randomUUID()
    await db.insert(torneos).values({
      id: torneoId,
      anio: 5000 + Math.floor(Math.random() * 1000),
    })

    const adminId = crypto.randomUUID()
    const correoAdmin = `admin-${adminId}@example.com`
    await db.insert(usuarios).values({
      id: adminId,
      name: 'Admin',
      email: correoAdmin,
      categoria: 'senior',
      rol: 'admin',
      torneoId: null,
    })

    await archivarParticipantesDeTorneo(torneoId)

    const [admin] = await db.select().from(usuarios).where(eq(usuarios.id, adminId))
    expect(admin.email).toBe(correoAdmin)
  })
})
