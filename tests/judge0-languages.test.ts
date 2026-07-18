import { describe, it, expect } from 'vitest'
import { MAPA_LENGUAJES } from '../src/server/judge0/languages'

describe('MAPA_LENGUAJES', () => {
  it('incluye los 5 lenguajes soportados por el motor de funciones', () => {
    expect(Object.keys(MAPA_LENGUAJES).sort()).toEqual(
      ['csharp', 'java', 'javascript', 'php', 'python'].sort(),
    )
  })

  it('cada entrada es un language_id numérico positivo', () => {
    for (const [, languageId] of Object.entries(MAPA_LENGUAJES)) {
      expect(Number.isInteger(languageId)).toBe(true)
      expect(languageId).toBeGreaterThan(0)
    }
  })
})
