import type { ResultadoCaso } from '#/server/judge/verdict'

export function RunResults({
  results,
  hint,
}: {
  results: ResultadoCaso[]
  hint: string | null
}) {
  return (
    <div className="mt-4">
      <ul className="flex flex-col gap-2">
        {results.map((r, i) => (
          <li key={i} className={r.aprobado ? 'text-green-600' : 'text-red-600'}>
            {r.aprobado ? '✅' : '❌'} Input: <code>{r.entrada}</code> — Esperado: <code>{r.salidaEsperada}</code> —
            Obtenido: <code>{r.salidaObtenida || r.salidaError}</code>
          </li>
        ))}
      </ul>
      {hint && (
        <p className="mt-2 rounded bg-purple-50 p-2 text-sm text-purple-800">💡 {hint}</p>
      )}
    </div>
  )
}
