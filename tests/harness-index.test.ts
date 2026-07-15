import { describe, it, expect } from 'vitest'
import { generarPrograma } from '../src/server/judge/harness'

describe('generarPrograma', () => {
  it('despacha al generador correcto por lenguaje', () => {
    const { archivo } = generarPrograma('python', 'def f(x):\n  return x', 'f', [{ nombre: 'x', tipo: 'int' }], 'int', [1])
    expect(archivo).toBe('main.py')
  })

  it('lanza error para un lenguaje no soportado', () => {
    expect(() => generarPrograma('cobol', '', 'f', [], 'int', [])).toThrow('Lenguaje no soportado: cobol')
  })
})
