import { describe, it, expect } from 'vitest'
import { formatearRestante } from '../src/components/CountdownTorneo'

describe('formatearRestante', () => {
  it('formatea minutos y segundos cuando falta menos de una hora', () => {
    expect(formatearRestante(65_000)).toBe('01:05')
  })

  it('formatea horas cuando falta una hora o más', () => {
    expect(formatearRestante(2 * 3600_000 + 5 * 60_000 + 9_000)).toBe('2:05:09')
  })

  it('no baja de cero cuando el tiempo ya pasó', () => {
    expect(formatearRestante(-5000)).toBe('00:00')
  })
})
