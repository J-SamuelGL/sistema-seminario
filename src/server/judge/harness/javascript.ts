import type { Parametro, TipoDato, Valor } from '../tipos'
import { tipoEscalarDeLista } from '../tipos'
import { MARCADOR_RESULTADO_JUEZ } from './marcador'

function literalJs(valor: unknown, tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    const lista = valor as unknown[]
    return '[' + lista.map((v) => literalJs(v, escalar)).join(', ') + ']'
  }
  if (tipo === 'string') return JSON.stringify(valor)
  return String(valor)
}

function lineaImpresion(tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    return `console.log('${MARCADOR_RESULTADO_JUEZ}' + '[' + __resultado_juez__.map(function(x) { return String(x); }).join(', ') + ']')`
  }
  return `console.log('${MARCADOR_RESULTADO_JUEZ}' + String(__resultado_juez__))`
}

export function generarProgramaJavascript(
  codigoParticipante: string,
  nombreFuncion: string,
  parametros: Parametro[],
  tipoRetorno: TipoDato,
  argumentos: Valor[],
): { archivo: string; contenido: string } {
  const args = argumentos
    .map((v, i) => literalJs(v, parametros[i].tipo))
    .join(', ')
  const contenido = [
    codigoParticipante,
    '',
    `var __resultado_juez__ = ${nombreFuncion}(${args});`,
    lineaImpresion(tipoRetorno),
  ].join('\n')
  return { archivo: 'main.js', contenido }
}
