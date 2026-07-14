import { describe, it, expect } from 'vitest'
import { debeMostrarHint } from '../src/server/judge/hintCadence'

describe('debeMostrarHint', () => {
  it('no muestra hint en las corridas 1, 2, 4 y 5', () => {
    expect(debeMostrarHint(1)).toBe(false)
    expect(debeMostrarHint(2)).toBe(false)
    expect(debeMostrarHint(4)).toBe(false)
    expect(debeMostrarHint(5)).toBe(false)
  })

  it('muestra hint en las corridas 3, 6 y 9', () => {
    expect(debeMostrarHint(3)).toBe(true)
    expect(debeMostrarHint(6)).toBe(true)
    expect(debeMostrarHint(9)).toBe(true)
  })
})
