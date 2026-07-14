import type { TipoDato, TipoEscalar, Valor } from './tipos'
import { tipoEscalarDeLista } from './tipos'

function formatearEscalar(valor: unknown, tipo: TipoEscalar): string {
  if (tipo === 'bool') return valor ? 'true' : 'false'
  return String(valor)
}

export function serializarCanonico(valor: Valor, tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    const lista = valor as unknown[]
    return '[' + lista.map((v) => formatearEscalar(v, escalar)).join(', ') + ']'
  }
  return formatearEscalar(valor, tipo as TipoEscalar)
}
