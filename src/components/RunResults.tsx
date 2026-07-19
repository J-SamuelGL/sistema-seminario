import type { ResultadoCasoPublico } from '#/server/judge/resultadoPublico'
import { formatearArgumentos } from '#/components/labels'

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
          <li
            key={i}
            className={r.aprobado ? 'text-green-600' : 'text-red-600'}
          >
            {r.aprobado ? '✅' : '❌'} Input:{' '}
            <code>{formatearArgumentos(r.argumentos)}</code> — Esperado:{' '}
            <code>{r.salidaEsperada}</code> — Obtenido:{' '}
            <code>{r.salidaObtenida || '—'}</code>
            {i === 0 && r.salidaConsola && (
              <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs text-gray-700">
                Consola:
                {'\n'}
                {r.salidaConsola}
              </pre>
            )}
            {i === 0 && r.salidaError && (
              <pre className="mt-1 whitespace-pre-wrap rounded bg-red-50 p-2 text-xs text-red-700">
                Error:
                {'\n'}
                {r.salidaError}
              </pre>
            )}
          </li>
        ))}
        {ocultos.length > 0 && (
          <li className={ocultosAprobados ? 'text-green-600' : 'text-red-600'}>
            {ocultosAprobados ? '✅' : '❌'} {ocultos.length} caso
            {ocultos.length > 1 ? 's' : ''} oculto
            {ocultos.length > 1 ? 's' : ''}
          </li>
        )}
      </ul>
      {hint && (
        <p className="mt-2 rounded bg-purple-50 p-2 text-sm text-purple-800">
          💡 {hint}
        </p>
      )}
    </div>
  )
}
