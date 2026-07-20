import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../src/server/db/client'
import { torneos } from '../src/server/db/schema'
import { sql } from 'drizzle-orm'
import {
  obtenerTorneoActual,
  obtenerTorneoPorId,
  asegurarEsTorneoActual,
} from '../src/server/tournament/actual'

describe('obtenerTorneoActual', () => {
  beforeEach(async () => {
    // Limpiar la tabla antes de cada test
    await db.execute(sql`DELETE FROM torneos`)
  })

  it('devuelve el torneo con creadoEn más reciente', async () => {
    const anioBase = 3000 + Math.floor(Math.random() * 1000)
    const idViejo = crypto.randomUUID()
    const idNuevo = crypto.randomUUID()
    await db.insert(torneos).values({
      id: idViejo,
      anio: anioBase,
      creadoEn: new Date('2020-01-01T00:00:00Z'),
    })
    await db.insert(torneos).values({
      id: idNuevo,
      anio: anioBase + 1,
      creadoEn: new Date('2021-01-01T00:00:00Z'),
    })

    const actual = await obtenerTorneoActual()
    expect(actual?.id).toBe(idNuevo)
  })
})

describe('obtenerTorneoPorId', () => {
  it('devuelve null si no existe', async () => {
    expect(await obtenerTorneoPorId(crypto.randomUUID())).toBeNull()
  })
})

describe('asegurarEsTorneoActual', () => {
  it('no lanza si el torneoId coincide con el torneo actual', () => {
    expect(() =>
      asegurarEsTorneoActual('t1', { id: 't1' }),
    ).not.toThrow()
  })

  it('lanza si el torneoId no coincide', () => {
    expect(() => asegurarEsTorneoActual('t1', { id: 't2' })).toThrow(
      'Este torneo ya no se puede editar',
    )
  })

  it('lanza si no hay ningún torneo actual', () => {
    expect(() => asegurarEsTorneoActual('t1', null)).toThrow(
      'Este torneo ya no se puede editar',
    )
  })
})
