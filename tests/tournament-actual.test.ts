import { describe, it, expect } from 'vitest'
import { db } from '../src/server/db/client'
import { torneos } from '../src/server/db/schema'
import {
  obtenerTorneoActual,
  obtenerTorneoPorId,
  asegurarEsTorneoActual,
} from '../src/server/tournament/actual'

describe('obtenerTorneoActual', () => {
  it('devuelve el torneo con creadoEn más reciente', async () => {
    const anioBase = 3000 + Math.floor(Math.random() * 1000)
    const idViejo = crypto.randomUUID()
    const idNuevo = crypto.randomUUID()
    // Usar fechas únicas para evitar colisiones sin necesidad de limpiar la tabla
    // Genera timestamp con 1-2 horas en el futuro para evitar colisiones de tests concurrentes
    const dateVieja = new Date(Date.now() + 60 * 60 * 1000) // 1 hora en el futuro
    const dateNueva = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 horas en el futuro
    await db.insert(torneos).values({
      id: idViejo,
      anio: anioBase,
      creadoEn: dateVieja,
    })
    await db.insert(torneos).values({
      id: idNuevo,
      anio: anioBase + 1,
      creadoEn: dateNueva,
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
