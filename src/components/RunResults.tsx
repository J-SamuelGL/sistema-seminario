import type { CaseResult } from '#/server/judge/verdict'

export function RunResults({ results }: { results: CaseResult[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {results.map((r, i) => (
        <li key={i} className={r.passed ? 'text-green-600' : 'text-red-600'}>
          {r.passed ? '✅' : '❌'} Input: <code>{r.input}</code> — Esperado: <code>{r.expectedOutput}</code> —
          Obtenido: <code>{r.actualOutput || r.stderr}</code>
        </li>
      ))}
    </ul>
  )
}
