import { describe, it, expect } from 'vitest'
import { db } from '../src/server/db/client'
import { estadoTorneo } from '../src/server/db/schema'
import { eq } from 'drizzle-orm'

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
