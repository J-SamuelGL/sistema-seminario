import { describe, it, expect } from 'vitest'
import { puedePreguntar } from '../src/server/assistant/limit'

describe('puedePreguntar', () => {
  it('allows a junior participant with 0 questions used', () => {
    expect(puedePreguntar({ categoria: 'junior', preguntasIaUsadas: 0 })).toBe(
      true,
    )
  })

  it('allows a junior participant with 1 question used', () => {
    expect(puedePreguntar({ categoria: 'junior', preguntasIaUsadas: 1 })).toBe(
      true,
    )
  })

  it('blocks a junior participant with 2 questions used', () => {
    expect(puedePreguntar({ categoria: 'junior', preguntasIaUsadas: 2 })).toBe(
      false,
    )
  })

  it('blocks a senior participant regardless of questions used', () => {
    expect(puedePreguntar({ categoria: 'senior', preguntasIaUsadas: 0 })).toBe(
      false,
    )
  })
})
