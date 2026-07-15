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

function compararFloats(obtenido: string, esperado: string): boolean {
  const numObtenido = Number(obtenido)
  const numEsperado = Number(esperado)
  if (!Number.isFinite(numObtenido) || !Number.isFinite(numEsperado)) return false
  return numObtenido === numEsperado
}

function partesDeLista(texto: string): string[] {
  const interior = texto.slice(1, -1)
  if (interior === '') return []
  return interior.split(', ')
}

/**
 * Compara la salida obtenida de un driver de lenguaje contra el texto canónico
 * esperado. Para tipos `float` (y `list<float>`) la comparación es numérica, ya
 * que no todos los drivers de lenguaje serializan floats con el mismo formato de
 * texto (p. ej. Python/Java imprimen `2.0`, mientras que el texto canónico y
 * JS/PHP/C# imprimen `2`). Para el resto de los tipos se mantiene la igualdad
 * estricta de strings.
 */
export function compararSalidas(salidaObtenida: string, salidaEsperadaTexto: string, tipo: TipoDato): boolean {
  if (tipo === 'float') {
    return compararFloats(salidaObtenida, salidaEsperadaTexto)
  }
  if (tipo === 'list<float>') {
    const obtenidos = partesDeLista(salidaObtenida)
    const esperados = partesDeLista(salidaEsperadaTexto)
    if (obtenidos.length !== esperados.length) return false
    return obtenidos.every((v, i) => compararFloats(v, esperados[i]))
  }
  return salidaObtenida === salidaEsperadaTexto
}
