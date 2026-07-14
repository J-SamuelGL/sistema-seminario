import { describe, it, expect } from 'vitest'
import { generarProgramaJavascript } from '../src/server/judge/harness/javascript'

describe('generarProgramaJavascript', () => {
  it('embebe argumentos y llama la función', () => {
    const { archivo, contenido } = generarProgramaJavascript(
      'function contarVocales(texto) {\n  return 0;\n}',
      'contarVocales',
      [{ nombre: 'texto', tipo: 'string' }],
      'int',
      ['hola'],
    )
    expect(archivo).toBe('main.js')
    expect(contenido).toContain('contarVocales("hola")')
    expect(contenido).toContain('console.log(String(__resultado_juez__))')
  })

  it('serializa listas con el formato canónico', () => {
    const { contenido } = generarProgramaJavascript(
      'function f(n) { return n.map(x => x * 2); }',
      'f',
      [{ nombre: 'n', tipo: 'list<int>' }],
      'list<int>',
      [[1, 2, 3]],
    )
    expect(contenido).toContain('f([1, 2, 3])')
    expect(contenido).toContain("__resultado_juez__.map(function(x) { return String(x); }).join(', ')")
  })
})
