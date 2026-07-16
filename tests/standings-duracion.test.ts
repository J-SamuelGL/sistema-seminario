import { describe, it, expect } from 'vitest'
import { calcularDuraciones } from '../src/server/standings/duracion'

const start = new Date('2026-07-16T09:00:00Z')

describe('calcularDuraciones', () => {
  it('returns an empty list when nothing was solved', () => {
    expect(calcularDuraciones([], start)).toEqual([])
  })

  it('duration of the first solved problem is measured from tournament start', () => {
    const filas = calcularDuraciones(
      [{ problemaId: 'p1', creadoEn: new Date('2026-07-16T09:15:00Z') }],
      start,
    )
    expect(filas).toEqual([{ problemaId: 'p1', duracionMinutos: 15 }])
  })

  it('duration of later problems is measured from the previous solve, not tournament start', () => {
    const filas = calcularDuraciones(
      [
        { problemaId: 'p1', creadoEn: new Date('2026-07-16T09:15:00Z') },
        { problemaId: 'p2', creadoEn: new Date('2026-07-16T09:40:00Z') },
      ],
      start,
    )
    expect(filas).toEqual([
      { problemaId: 'p1', duracionMinutos: 15 },
      { problemaId: 'p2', duracionMinutos: 25 },
    ])
  })

  it('orders by when each problem was actually solved, not by list order', () => {
    const filas = calcularDuraciones(
      [
        { problemaId: 'p2', creadoEn: new Date('2026-07-16T09:40:00Z') },
        { problemaId: 'p1', creadoEn: new Date('2026-07-16T09:15:00Z') },
      ],
      start,
    )
    expect(filas).toEqual([
      { problemaId: 'p1', duracionMinutos: 15 },
      { problemaId: 'p2', duracionMinutos: 25 },
    ])
  })
})
