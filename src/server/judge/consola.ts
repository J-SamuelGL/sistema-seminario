import { MARCADOR_RESULTADO_JUEZ } from './harness/marcador'

export function separarSalidaConsola(salidaCruda: string): {
  salidaConsola: string
  salidaResultado: string
} {
  const indice = salidaCruda.lastIndexOf(MARCADOR_RESULTADO_JUEZ)
  if (indice === -1) {
    return { salidaConsola: salidaCruda.trim(), salidaResultado: '' }
  }
  return {
    salidaConsola: salidaCruda.slice(0, indice).trim(),
    salidaResultado: salidaCruda
      .slice(indice + MARCADOR_RESULTADO_JUEZ.length)
      .trim(),
  }
}
