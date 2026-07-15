import type { Parametro, TipoDato, TipoEscalar, Valor } from '../tipos'
import { tipoEscalarDeLista } from '../tipos'
import { MARCADOR_RESULTADO_JUEZ } from './marcador'

function tipoJavaEscalar(tipo: TipoEscalar): string {
  return { int: 'Integer', float: 'Double', bool: 'Boolean', string: 'String' }[
    tipo
  ]
}

function tipoJavaRetorno(tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) return `List<${tipoJavaEscalar(escalar)}>`
  if (tipo === 'int') return 'int'
  if (tipo === 'float') return 'double'
  if (tipo === 'bool') return 'boolean'
  return 'String'
}

function literalJava(valor: unknown, tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    const lista = valor as unknown[]
    const elementos = lista.map((v) => literalJava(v, escalar)).join(', ')
    return `List.<${tipoJavaEscalar(escalar)}>of(${elementos})`
  }
  if (tipo === 'string') return JSON.stringify(valor)
  return String(valor)
}

function lineasImpresion(tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    return [
      '    List<String> __textos_juez__ = new ArrayList<>();',
      `    for (${tipoJavaEscalar(escalar)} __elemento_juez__ : __resultado_juez__) {`,
      '      __textos_juez__.add(String.valueOf(__elemento_juez__));',
      '    }',
      `    System.out.println("${MARCADOR_RESULTADO_JUEZ}[" + String.join(", ", __textos_juez__) + "]");`,
    ].join('\n')
  }
  return `    System.out.println("${MARCADOR_RESULTADO_JUEZ}" + String.valueOf(__resultado_juez__));`
}

export function generarProgramaJava(
  codigoParticipante: string,
  nombreFuncion: string,
  parametros: Parametro[],
  tipoRetorno: TipoDato,
  argumentos: Valor[],
): { archivo: string; contenido: string } {
  const args = argumentos
    .map((v, i) => literalJava(v, parametros[i].tipo))
    .join(', ')
  const contenido = [
    'import java.util.*;',
    '',
    'public class Main {',
    codigoParticipante,
    '',
    '  public static void main(String[] args) {',
    `    ${tipoJavaRetorno(tipoRetorno)} __resultado_juez__ = ${nombreFuncion}(${args});`,
    lineasImpresion(tipoRetorno),
    '  }',
    '}',
  ].join('\n')
  return { archivo: 'Main.java', contenido }
}
