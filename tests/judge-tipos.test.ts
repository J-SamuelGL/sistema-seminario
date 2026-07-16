import { describe, it, expect } from 'vitest'
import {
  tipoEscalarDeLista,
  valorCoincideConTipo,
} from '../src/server/judge/tipos'

describe('tipoEscalarDeLista', () => {
  it('extrae el escalar de un tipo lista', () => {
    expect(tipoEscalarDeLista('list<int>')).toBe('int')
    expect(tipoEscalarDeLista('list<string>')).toBe('string')
  })

  it('devuelve null para un tipo escalar', () => {
    expect(tipoEscalarDeLista('int')).toBeNull()
  })
})

describe('valorCoincideConTipo', () => {
  it('valida escalares', () => {
    expect(valorCoincideConTipo(3, 'int')).toBe(true)
    expect(valorCoincideConTipo(3.5, 'int')).toBe(false)
    expect(valorCoincideConTipo(3.5, 'float')).toBe(true)
    expect(valorCoincideConTipo(true, 'bool')).toBe(true)
    expect(valorCoincideConTipo('hola', 'string')).toBe(true)
    expect(valorCoincideConTipo('hola', 'int')).toBe(false)
  })

  it('valida listas de escalares', () => {
    expect(valorCoincideConTipo([1, 2, 3], 'list<int>')).toBe(true)
    expect(valorCoincideConTipo([1, 'x'], 'list<int>')).toBe(false)
    expect(valorCoincideConTipo([], 'list<int>')).toBe(true)
    expect(valorCoincideConTipo('no es lista', 'list<int>')).toBe(false)
  })
})
