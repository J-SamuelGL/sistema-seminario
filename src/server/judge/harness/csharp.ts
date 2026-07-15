import type { Parametro, TipoDato, TipoEscalar, Valor } from '../tipos'
import { tipoEscalarDeLista } from '../tipos'

function tipoCsharpEscalar(tipo: TipoEscalar): string {
  return { int: 'int', float: 'double', bool: 'bool', string: 'string' }[tipo]
}

function literalCsharp(valor: unknown, tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    const lista = valor as unknown[]
    const tipoElemento = tipoCsharpEscalar(escalar)
    const elementos = lista.map((v) => literalCsharp(v, escalar)).join(', ')
    return `new List<${tipoElemento}> { ${elementos} }`
  }
  if (tipo === 'bool') return valor ? 'true' : 'false'
  if (tipo === 'string') return JSON.stringify(valor)
  return String(valor)
}

function lineaImpresion(tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    if (escalar === 'bool') {
      return '    Console.WriteLine("[" + string.Join(", ", __resultado_juez__.ConvertAll(x => x ? "true" : "false")) + "]");'
    }
    return '    Console.WriteLine("[" + string.Join(", ", __resultado_juez__) + "]");'
  }
  if (tipo === 'bool') return '    Console.WriteLine(__resultado_juez__ ? "true" : "false");'
  return '    Console.WriteLine(__resultado_juez__);'
}

export function generarProgramaCsharp(
  codigoParticipante: string,
  nombreFuncion: string,
  parametros: Parametro[],
  tipoRetorno: TipoDato,
  argumentos: Valor[],
): { archivo: string; contenido: string } {
  const args = argumentos.map((v, i) => literalCsharp(v, parametros[i].tipo)).join(', ')
  const contenido = [
    'using System;',
    'using System.Collections.Generic;',
    '',
    'class Program {',
    codigoParticipante,
    '',
    '  static void Main() {',
    `    var __resultado_juez__ = ${nombreFuncion}(${args});`,
    lineaImpresion(tipoRetorno),
    '  }',
    '}',
  ].join('\n')
  return { archivo: 'main.cs', contenido }
}
