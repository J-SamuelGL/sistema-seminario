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
    <div className="mt-4 font-sans">
      <ul className="flex flex-col gap-2 text-sm">
        {visibles.map((r, i) => (
          <li
            key={i}
            className={r.aprobado ? 'text-laurel-ink' : 'text-red-600'}
          >
            {r.aprobado ? '✅' : '❌'} Input:{' '}
            <code>{formatearArgumentos(r.argumentos)}</code> — Esperado:{' '}
            <code>{r.salidaEsperada}</code> — Obtenido:{' '}
            <code>{r.salidaObtenida || '—'}</code>
            {i === 0 && r.salidaConsola && (
              <pre className="mt-1 rounded bg-paper-soft p-2 text-xs whitespace-pre-wrap text-ink-soft">
                Consola:
                {'\n'}
                {r.salidaConsola}
              </pre>
            )}
            {i === 0 && r.salidaError && (
              <pre className="mt-1 rounded bg-red-50 p-2 text-xs whitespace-pre-wrap text-red-700">
                Error:
                {'\n'}
                {r.salidaError}
              </pre>
            )}
          </li>
        ))}
        {ocultos.length > 0 && (
          <li className={ocultosAprobados ? 'text-laurel-ink' : 'text-red-600'}>
            {ocultosAprobados ? '✅' : '❌'} {ocultos.length} caso
            {ocultos.length > 1 ? 's' : ''} oculto
            {ocultos.length > 1 ? 's' : ''}
          </li>
        )}
      </ul>
      {hint && (
        <p className="mt-2 rounded border border-gold-soft/40 bg-amber-soft p-2 text-sm text-amber-ink">
          💡 {hint}
        </p>
      )}
    </div>
  )
}
