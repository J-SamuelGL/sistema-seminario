import { describe, it, expect } from 'vitest'
import { generarProgramaJava } from '../src/server/judge/harness/java'
import { MARCADOR_RESULTADO_JUEZ } from '../src/server/judge/harness/marcador'

describe('generarProgramaJava', () => {
  it('envuelve el método del participante en la clase Main', () => {
    const { archivo, contenido } = generarProgramaJava(
      '  public static int contarVocales(String texto) {\n    return 0;\n  }',
      'contarVocales',
      [{ nombre: 'texto', tipo: 'string' }],
      'int',
      ['hola'],
    )
    expect(archivo).toBe('Main.java')
    expect(contenido).toContain('public class Main {')
    expect(contenido).toContain('contarVocales("hola")')
    expect(contenido).toContain(
      `System.out.println("${MARCADOR_RESULTADO_JUEZ}" + String.valueOf(__resultado_juez__));`,
    )
  })

  it('usa List.<Tipo>of() para argumentos de lista, tipado explícito', () => {
    const { contenido } = generarProgramaJava(
      '  public static List<Integer> f(List<Integer> n) { return n; }',
      'f',
      [{ nombre: 'n', tipo: 'list<int>' }],
      'list<int>',
      [[1, 2, 3]],
    )
    expect(contenido).toContain('List.<Integer>of(1, 2, 3)')
  })

  it('maneja listas vacías con tipado explícito', () => {
    const { contenido } = generarProgramaJava(
      '  public static List<Integer> f(List<Integer> n) { return n; }',
      'f',
      [{ nombre: 'n', tipo: 'list<int>' }],
      'list<int>',
      [[]],
    )
    expect(contenido).toContain('List.<Integer>of()')
  })
})
