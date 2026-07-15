import { describe, it, expect } from 'vitest'
import { generarProgramaCsharp } from '../src/server/judge/harness/csharp'

describe('generarProgramaCsharp', () => {
  it('envuelve el método del participante en la clase Program', () => {
    const { archivo, contenido } = generarProgramaCsharp(
      '  public static int ContarVocales(string texto) {\n    return 0;\n  }',
      'ContarVocales',
      [{ nombre: 'texto', tipo: 'string' }],
      'int',
      ['hola'],
    )
    expect(archivo).toBe('main.cs')
    expect(contenido).toContain('class Program {')
    expect(contenido).toContain('ContarVocales("hola")')
    expect(contenido).toContain('Console.WriteLine(__resultado_juez__);')
  })

  it('serializa bool en minúscula, no con la capitalización nativa de C#', () => {
    const { contenido } = generarProgramaCsharp(
      '  public static bool F(int x) { return true; }',
      'F',
      [{ nombre: 'x', tipo: 'int' }],
      'bool',
      [1],
    )
    expect(contenido).toContain('Console.WriteLine(__resultado_juez__ ? "true" : "false");')
  })

  it('serializa list<bool> con formato canónico', () => {
    const { contenido } = generarProgramaCsharp(
      '  public static List<bool> F() { return new List<bool> { true, false }; }',
      'F',
      [],
      'list<bool>',
      [],
    )
    expect(contenido).toContain('x ? "true" : "false"')
  })
})
