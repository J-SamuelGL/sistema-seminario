import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '../src/server/db/client'
import { usuarios, sesiones } from '../src/server/db/schema'
import {
  contarSesionesActivas,
  cerrarOtrasSesiones,
} from '../src/server/sesiones/activas'

async function crearUsuarioPrueba() {
  const id = crypto.randomUUID()
  await db.insert(usuarios).values({
    id,
    name: 'Usuario Sesiones',
    email: `sesiones-${id}@example.com`,
    categoria: 'junior',
  })
  return id
}

async function crearSesion(usuarioId: string, expiraEn: Date) {
  const id = crypto.randomUUID()
  await db.insert(sesiones).values({
    id,
    userId: usuarioId,
    token: crypto.randomUUID(),
    expiresAt: expiraEn,
  })
  return id
}

const enUnaHora = () => new Date(Date.now() + 60 * 60 * 1000)
const haceUnaHora = () => new Date(Date.now() - 60 * 60 * 1000)

describe('contarSesionesActivas', () => {
  it('cuenta solo las sesiones no expiradas del usuario', async () => {
    const usuarioId = await crearUsuarioPrueba()
    const otroUsuarioId = await crearUsuarioPrueba()
    await crearSesion(usuarioId, enUnaHora())
    await crearSesion(usuarioId, enUnaHora())
    await crearSesion(usuarioId, haceUnaHora())
    await crearSesion(otroUsuarioId, enUnaHora())

    expect(await contarSesionesActivas(usuarioId)).toBe(2)
  })
})

describe('cerrarOtrasSesiones', () => {
  it('elimina todas las sesiones del usuario excepto la actual', async () => {
    const usuarioId = await crearUsuarioPrueba()
    const sesionActualId = await crearSesion(usuarioId, enUnaHora())
    await crearSesion(usuarioId, enUnaHora())
    await crearSesion(usuarioId, haceUnaHora())

    const cerradas = await cerrarOtrasSesiones(usuarioId, sesionActualId)

    expect(cerradas).toBe(2)
    const restantes = await db
      .select()
      .from(sesiones)
      .where(eq(sesiones.userId, usuarioId))
    expect(restantes).toHaveLength(1)
    expect(restantes[0].id).toBe(sesionActualId)
  })

  it('no toca las sesiones de otros usuarios', async () => {
    const usuarioId = await crearUsuarioPrueba()
    const otroUsuarioId = await crearUsuarioPrueba()
    const sesionActualId = await crearSesion(usuarioId, enUnaHora())
    const sesionAjenaId = await crearSesion(otroUsuarioId, enUnaHora())

    const cerradas = await cerrarOtrasSesiones(usuarioId, sesionActualId)

    expect(cerradas).toBe(0)
    const ajenas = await db
      .select()
      .from(sesiones)
      .where(eq(sesiones.userId, otroUsuarioId))
    expect(ajenas).toHaveLength(1)
    expect(ajenas[0].id).toBe(sesionAjenaId)
  })
})
