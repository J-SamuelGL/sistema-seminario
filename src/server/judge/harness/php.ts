import type { Parametro, TipoDato, Valor } from '../tipos'
import { tipoEscalarDeLista } from '../tipos'

function literalPhpString(valor: string): string {
  return "'" + valor.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
}

function literalPhp(valor: unknown, tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    const lista = valor as unknown[]
    return '[' + lista.map((v) => literalPhp(v, escalar)).join(', ') + ']'
  }
  if (tipo === 'bool') return valor ? 'true' : 'false'
  if (tipo === 'string') return literalPhpString(valor as string)
  return String(valor)
}

function lineaImpresion(tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    if (escalar === 'bool') {
      return "echo '[' . implode(', ', array_map(function($x) { return $x ? 'true' : 'false'; }, $__resultado_juez__)) . ']';"
    }
    return "echo '[' . implode(', ', array_map('strval', $__resultado_juez__)) . ']';"
  }
  if (tipo === 'bool') return "echo $__resultado_juez__ ? 'true' : 'false';"
  return 'echo $__resultado_juez__;'
}

export function generarProgramaPhp(
  codigoParticipante: string,
  nombreFuncion: string,
  parametros: Parametro[],
  tipoRetorno: TipoDato,
  argumentos: Valor[],
): { archivo: string; contenido: string } {
  const args = argumentos.map((v, i) => literalPhp(v, parametros[i].tipo)).join(', ')
  const contenido = [
    '<?php',
    codigoParticipante,
    '',
    `$__resultado_juez__ = ${nombreFuncion}(${args});`,
    lineaImpresion(tipoRetorno),
  ].join('\n')
  return { archivo: 'main.php', contenido }
}
