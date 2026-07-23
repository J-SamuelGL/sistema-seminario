import { describe, it, expect } from 'vitest'
import { tiempoRelativo } from '../src/components/ActividadRecienteFeed'

describe('tiempoRelativo', () => {
  it('muestra segundos si pasó menos de un minuto', () => {
    const ahora = new Date('2026-07-23T15:00:30Z')
    expect(tiempoRelativo(new Date('2026-07-23T15:00:00Z'), ahora)).toBe('hace 30s')
  })

  it('muestra minutos si pasó una hora o menos', () => {
    const ahora = new Date('2026-07-23T15:10:00Z')
    expect(tiempoRelativo(new Date('2026-07-23T15:00:00Z'), ahora)).toBe('hace 10m')
  })

  it('muestra horas si pasó más de una hora', () => {
    const ahora = new Date('2026-07-23T17:05:00Z')
    expect(tiempoRelativo(new Date('2026-07-23T15:00:00Z'), ahora)).toBe('hace 2h')
  })
})
