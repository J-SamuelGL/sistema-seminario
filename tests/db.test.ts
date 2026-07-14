import { describe, it, expect } from 'vitest'
import { db } from '../src/server/db/client'
import { estadoTorneo, usuarios, problemas, corridas } from '../src/server/db/schema'
import { and, eq, sql } from 'drizzle-orm'

describe('conexión a la base de datos', () => {
  it('puede insertar y leer estado_torneo', async () => {
    await db.insert(estadoTorneo).ignore().values({ id: 1 })
    const rows = await db
      .select()
      .from(estadoTorneo)
      .where(eq(estadoTorneo.id, 1))
    expect(rows.length).toBe(1)
  })
})

describe('categorías y corridas', () => {
  it('inserta y lee un usuario invitado con carné', async () => {
    const id = crypto.randomUUID()
    await db.insert(usuarios).values({
      id,
      name: 'Ana Invitada',
      email: `ana-${id}@example.com`,
      categoria: 'invitado',
      carnet: '22-1234-2020',
    })
    const rows = await db.select().from(usuarios).where(eq(usuarios.id, id))
    const usuario = rows.length > 0 ? rows[0] : null
    expect(usuario?.categoria).toBe('invitado')
    expect(usuario?.carnet).toBe('22-1234-2020')
  })

  it('acepta un problema con grupo invitado_junior o senior', async () => {
    const id = crypto.randomUUID()
    await db.insert(problemas).values({
      id,
      titulo: 'Suma',
      descripcion: 'Suma dos números',
      dificultad: 'easy',
      lenguajesPermitidos: ['python'],
      grupo: 'senior',
    })
    const rows = await db.select().from(problemas).where(eq(problemas.id, id))
    expect(rows[0]?.grupo).toBe('senior')
  })

  it('incrementa el contador de corridas con onDuplicateKeyUpdate', async () => {
    const usuarioId = crypto.randomUUID()
    await db.insert(usuarios).values({
      id: usuarioId,
      name: 'Beto',
      email: `beto-${usuarioId}@example.com`,
      categoria: 'invitado',
    })
    const problemaId = crypto.randomUUID()
    await db.insert(problemas).values({
      id: problemaId,
      titulo: 'P',
      descripcion: 'd',
      dificultad: 'easy',
      lenguajesPermitidos: ['python'],
      grupo: 'invitado_junior',
    })

    for (let i = 0; i < 2; i++) {
      await db
        .insert(corridas)
        .values({ usuarioId, problemaId, contador: 1 })
        .onDuplicateKeyUpdate({ set: { contador: sql`${corridas.contador} + 1` } })
    }

    const rows = await db
      .select()
      .from(corridas)
      .where(and(eq(corridas.usuarioId, usuarioId), eq(corridas.problemaId, problemaId)))
    expect(rows[0]?.contador).toBe(2)
  })
})
