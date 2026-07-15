import type { ResultadoCasoPublico } from '#/server/judge/resultadoPublico'

export function RunResults({
  results,
  hint,
}: {
  results: ResultadoCasoPublico[]
  hint: string | null
}) {
  const visibles = results.filter((r) => r.visible)
  const ocultos = results.filter((r) => !r.visible)
  const ocultosAprobados = ocultos.every((r) => r.aprobado)

  return (
    <div className="mt-4">
      <ul className="flex flex-col gap-2">
        {visibles.map((r, i) => (
          <li key={i} className={r.aprobado ? 'text-green-600' : 'text-red-600'}>
            {r.aprobado ? '✅' : '❌'} Input: <code>{r.argumentos.map((a) => JSON.stringify(a)).join(', ')}</code> —
            Esperado: <code>{r.salidaEsperada}</code> — Obtenido: <code>{r.salidaObtenida || r.salidaError}</code>
          </li>
        ))}
        {ocultos.length > 0 && (
          <li className={ocultosAprobados ? 'text-green-600' : 'text-red-600'}>
            {ocultosAprobados ? '✅' : '❌'} {ocultos.length} caso{ocultos.length > 1 ? 's' : ''} oculto
            {ocultos.length > 1 ? 's' : ''}
          </li>
        )}
      </ul>
      {hint && <p className="mt-2 rounded bg-purple-50 p-2 text-sm text-purple-800">💡 {hint}</p>}
    </div>
  )
}
