import { describe, it, expect } from 'vitest'
import { generarProgramaPhp } from '../src/server/judge/harness/php'

describe('generarProgramaPhp', () => {
  it('antepone la etiqueta <?php aunque el participante no la escriba', () => {
    const { archivo, contenido } = generarProgramaPhp(
      'function contarVocales($texto) {\n  return 0;\n}',
      'contarVocales',
      [{ nombre: 'texto', tipo: 'string' }],
      'int',
      ['hola'],
    )
    expect(archivo).toBe('main.php')
    expect(contenido.startsWith('<?php')).toBe(true)
    expect(contenido).toContain("contarVocales('hola')")
    expect(contenido).toContain('echo $__resultado_juez__;')
  })

  it('escapa comillas simples en strings sin depender de interpolación de $', () => {
    const { contenido } = generarProgramaPhp(
      'function f($x) { return $x; }',
      'f',
      [{ nombre: 'x', tipo: 'string' }],
      'string',
      ["it's $5"],
    )
    expect(contenido).toContain("f('it\\'s $5')")
  })

  it('serializa bool y list<bool> con formato canónico, no con var_dump nativo', () => {
    const { contenido } = generarProgramaPhp(
      'function f($x) { return true; }',
      'f',
      [{ nombre: 'x', tipo: 'int' }],
      'bool',
      [1],
    )
    expect(contenido).toContain("echo $__resultado_juez__ ? 'true' : 'false';")
  })
})
