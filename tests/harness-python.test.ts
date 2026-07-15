import { describe, it, expect } from 'vitest'
import { generarProgramaPython } from '../src/server/judge/harness/python'
import { MARCADOR_RESULTADO_JUEZ } from '../src/server/judge/harness/marcador'

describe('generarProgramaPython', () => {
  it('embebe argumentos escalares y llama la función', () => {
    const { archivo, contenido } = generarProgramaPython(
      'def contar_vocales(texto):\n    return 0',
      'contar_vocales',
      [{ nombre: 'texto', tipo: 'string' }],
      'int',
      ['hola'],
    )
    expect(archivo).toBe('main.py')
    expect(contenido).toContain('def contar_vocales(texto):')
    expect(contenido).toContain('contar_vocales("hola")')
    expect(contenido).toContain(
      `print('${MARCADOR_RESULTADO_JUEZ}' + str(__resultado_juez__))`,
    )
  })

  it('antepone el marcador de resultado a la línea final, para separarla de los prints del participante', () => {
    const { contenido } = generarProgramaPython(
      'def f(x):\n    print("depurando")\n    return x',
      'f',
      [{ nombre: 'x', tipo: 'int' }],
      'int',
      [1],
    )
    const lineas = contenido.trim().split('\n')
    expect(lineas[lineas.length - 1]).toContain(MARCADOR_RESULTADO_JUEZ)
  })

  it('embebe listas y booleanos como literales Python', () => {
    const { contenido } = generarProgramaPython(
      'def f(numeros, activo):\n    return numeros',
      'f',
      [
        { nombre: 'numeros', tipo: 'list<int>' },
        { nombre: 'activo', tipo: 'bool' },
      ],
      'list<int>',
      [[1, 2, 3], true],
    )
    expect(contenido).toContain('f([1, 2, 3], True)')
  })

  it('serializa un retorno list<bool> con el formato canónico', () => {
    const { contenido } = generarProgramaPython(
      'def f(x):\n    return [True, False]',
      'f',
      [{ nombre: 'x', tipo: 'int' }],
      'list<bool>',
      [1],
    )
    expect(contenido).toContain("'true' if x else 'false'")
  })
})
