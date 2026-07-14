import type { Parametro, TipoDato, Valor } from '../tipos'
import { tipoEscalarDeLista } from '../tipos'

function literalPython(valor: unknown, tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    const lista = valor as unknown[]
    return '[' + lista.map((v) => literalPython(v, escalar)).join(', ') + ']'
  }
  if (tipo === 'bool') return valor ? 'True' : 'False'
  if (tipo === 'string') return JSON.stringify(valor)
  return String(valor)
}

function lineaImpresion(tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    if (escalar === 'bool') {
      return "print('[' + ', '.join('true' if x else 'false' for x in __resultado_juez__) + ']')"
    }
    return "print('[' + ', '.join(str(x) for x in __resultado_juez__) + ']')"
  }
  if (tipo === 'bool') return "print('true' if __resultado_juez__ else 'false')"
  return 'print(__resultado_juez__)'
}

export function generarProgramaPython(
  codigoParticipante: string,
  nombreFuncion: string,
  parametros: Parametro[],
  tipoRetorno: TipoDato,
  argumentos: Valor[],
): { archivo: string; contenido: string } {
  const args = argumentos.map((v, i) => literalPython(v, parametros[i].tipo)).join(', ')
  const contenido = [
    codigoParticipante,
    '',
    `__resultado_juez__ = ${nombreFuncion}(${args})`,
    lineaImpresion(tipoRetorno),
  ].join('\n')
  return { archivo: 'main.py', contenido }
}
