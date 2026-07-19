import { useMemo } from 'react'

/**
 * Calcula el problema anterior/siguiente a partir de la lista completa,
 * saltando los que ya están resueltos (no se pueden volver a abrir — ver
 * loader de `_app/problemas/$problemaId.tsx`).
 */
export function usePrevNextProblema<T extends { id: string }>(
  listaProblemas: T[],
  resueltosIds: Set<string>,
  problemaId: string,
) {
  return useMemo(() => {
    const indice = listaProblemas.findIndex((p) => p.id === problemaId)
    let anterior: T | null = null
    for (let i = indice - 1; i >= 0; i--) {
      if (!resueltosIds.has(listaProblemas[i].id)) {
        anterior = listaProblemas[i]
        break
      }
    }
    let siguiente: T | null = null
    for (let i = indice + 1; i < listaProblemas.length; i++) {
      if (!resueltosIds.has(listaProblemas[i].id)) {
        siguiente = listaProblemas[i]
        break
      }
    }
    return { anterior, siguiente, indice }
  }, [listaProblemas, resueltosIds, problemaId])
}
