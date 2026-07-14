import type { ResultadoCaso } from '#/server/judge/verdict'

export function RunResults({ results }: { results: ResultadoCaso[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {results.map((r, i) => (
        <li key={i} className={r.aprobado ? 'text-green-600' : 'text-red-600'}>
          {r.aprobado ? '✅' : '❌'} Input: <code>{r.entrada}</code> — Esperado: <code>{r.salidaEsperada}</code> —
          Obtenido: <code>{r.salidaObtenida || r.salidaError}</code>
        </li>
      ))}
    </ul>
  )
}
