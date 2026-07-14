import { describe, it, expect } from 'vitest'
import { serializarCanonico } from '../src/server/judge/serializar'

describe('serializarCanonico', () => {
  it('serializa escalares', () => {
    expect(serializarCanonico(3, 'int')).toBe('3')
    expect(serializarCanonico(-4, 'int')).toBe('-4')
    expect(serializarCanonico('hola', 'string')).toBe('hola')
    expect(serializarCanonico(true, 'bool')).toBe('true')
    expect(serializarCanonico(false, 'bool')).toBe('false')
  })

  it('serializa listas con el mismo formato en todos los tipos', () => {
    expect(serializarCanonico([2, 4, 6], 'list<int>')).toBe('[2, 4, 6]')
    expect(serializarCanonico([], 'list<int>')).toBe('[]')
    expect(serializarCanonico([true, false], 'list<bool>')).toBe('[true, false]')
    expect(serializarCanonico(['a', 'b'], 'list<string>')).toBe('[a, b]')
  })
})
