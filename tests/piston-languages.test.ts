import { describe, it, expect } from 'vitest'
import { MAPA_LENGUAJES } from '../src/server/piston/languages'

describe('MAPA_LENGUAJES', () => {
  it('incluye los 5 lenguajes soportados por el motor de funciones', () => {
    expect(Object.keys(MAPA_LENGUAJES).sort()).toEqual(
      ['csharp', 'java', 'javascript', 'php', 'python'].sort(),
    )
  })

  it('cada entrada tiene language y version no vacíos', () => {
    for (const [, mapeo] of Object.entries(MAPA_LENGUAJES)) {
      expect(mapeo.language.length).toBeGreaterThan(0)
      expect(mapeo.version.length).toBeGreaterThan(0)
    }
  })
})
