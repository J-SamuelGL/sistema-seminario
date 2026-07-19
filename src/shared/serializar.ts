import type { TipoDato, TipoEscalar, Valor } from '#/server/judge/tipos'
import { tipoEscalarDeLista } from '#/server/judge/tipos'

// Vive en `src/shared` (no en `src/server`) porque `serializarCanonico` se usa
// tanto en el servidor (`src/server/judge/runTestCases.ts`) como directamente
// desde un componente cliente (`_app/problemas/$problemaId.tsx`, para mostrar
// la salida esperada de los casos de ejemplo sin ir al servidor). Es una
// función pura — no depende de `db/client` ni de ningún otro módulo
// server-only — por lo que puede vivir fuera de la convención server-fn.
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
