import { describe, it, expect } from 'vitest'
import {
  serializarCanonico,
  compararSalidas,
} from '../src/server/judge/serializar'

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
    expect(serializarCanonico([true, false], 'list<bool>')).toBe(
      '[true, false]',
    )
    expect(serializarCanonico(['a', 'b'], 'list<string>')).toBe('[a, b]')
  })
})

describe('compararSalidas', () => {
  it('compara floats numéricamente, ignorando el formato de texto del driver', () => {
    expect(compararSalidas('2.0', '2', 'float')).toBe(true)
    expect(compararSalidas('2.5', '2.5', 'float')).toBe(true)
    expect(compararSalidas('3.0', '2', 'float')).toBe(false)
  })

  it('falla (no pasa en silencio) si algún lado de un float no parsea como número finito', () => {
    expect(compararSalidas('abc', '2', 'float')).toBe(false)
    expect(compararSalidas('2', 'abc', 'float')).toBe(false)
    expect(compararSalidas('NaN', '2', 'float')).toBe(false)
  })

  it('compara list<float> elemento por elemento, numéricamente', () => {
    expect(compararSalidas('[2.0, 2.5]', '[2, 2.5]', 'list<float>')).toBe(true)
    expect(compararSalidas('[2.0, 3.0]', '[2, 2.5]', 'list<float>')).toBe(false)
    expect(compararSalidas('[]', '[]', 'list<float>')).toBe(true)
  })

  it('falla list<float> si las longitudes difieren', () => {
    expect(compararSalidas('[2.0, 3.0]', '[2]', 'list<float>')).toBe(false)
  })

  it('no cambia el comportamiento de tipos que no son float (igualdad estricta de strings)', () => {
    expect(compararSalidas('2', '2.0', 'int')).toBe(false)
    expect(compararSalidas('2', '2', 'int')).toBe(true)
    expect(compararSalidas('true', 'true', 'bool')).toBe(true)
    expect(compararSalidas('hola', 'hola', 'string')).toBe(true)
    expect(compararSalidas('[2, 4]', '[2, 4]', 'list<int>')).toBe(true)
  })
})
