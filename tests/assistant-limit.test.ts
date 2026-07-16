import { describe, it, expect } from 'vitest'
import { puedePreguntar } from '../src/server/assistant/limit'

describe('puedePreguntar', () => {
  it('permite a un invitado con 0 preguntas usadas', () => {
    expect(
      puedePreguntar({ categoria: 'invitado', preguntasIaUsadas: 0 }),
    ).toBe(true)
  })

  it('permite a un invitado con 2 preguntas usadas', () => {
    expect(
      puedePreguntar({ categoria: 'invitado', preguntasIaUsadas: 2 }),
    ).toBe(true)
  })

  it('bloquea a un invitado con 3 preguntas usadas', () => {
    expect(
      puedePreguntar({ categoria: 'invitado', preguntasIaUsadas: 3 }),
    ).toBe(false)
  })

  it('bloquea a un junior sin importar las preguntas usadas', () => {
    expect(puedePreguntar({ categoria: 'junior', preguntasIaUsadas: 0 })).toBe(
      false,
    )
  })

  it('bloquea a un senior sin importar las preguntas usadas', () => {
    expect(puedePreguntar({ categoria: 'senior', preguntasIaUsadas: 0 })).toBe(
      false,
    )
  })
})
