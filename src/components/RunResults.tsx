import { useEffect, useState } from 'react'
import type { ResultadoCasoPublico } from '#/server/judge/resultadoPublico'
import { formatearArgumentos } from '#/components/labels'
import { CornerFrame } from '#/components/CornerFrame'
import {
  LOGRO_TEXT_TERMINAL,
  LOGRO_LINE_TERMINAL,
} from '#/components/brandStyles'

function CampoResultado({
  etiqueta,
  valor,
  error = false,
}: {
  etiqueta: string
  valor: string
  error?: boolean
}) {
  return (
    <div>
      <div className="font-display text-[10px] font-bold tracking-wide text-[oklch(50%_0.02_150)] uppercase">
        {etiqueta}
      </div>
      <pre
        className={`mt-1 rounded-sm border px-3 py-2 font-mono text-[12.5px] whitespace-pre-wrap ${
          error
            ? 'border-[oklch(45%_0.1_25/0.5)] bg-[oklch(16%_0.04_25)] text-[oklch(80%_0.15_25)]'
            : 'border-[oklch(30%_0.02_150/0.6)] bg-[oklch(12%_0.02_150)] text-[oklch(82%_0.02_150)]'
        }`}
      >
        {valor}
      </pre>
    </div>
  )
}

export function RunResults({
  results,
  hint,
}: {
  results: ResultadoCasoPublico[]
  hint: string | null
}) {
  const [activo, setActivo] = useState(0)
  // Cada corrida reemplaza `results` por una nueva referencia (viene de
  // `ejecutar.data`, no hay remount del componente entre corridas), así que
  // sin esto el tab seleccionado quedaría apuntando al caso de la corrida
  // anterior en vez de volver a "Caso 1".
  useEffect(() => {
    setActivo(0)
  }, [results])
  const todosAprobados = results.every((r) => r.aprobado)
  const tono = todosAprobados ? 'exito' : 'error'
  const seleccionado = results[activo]

  return (
    <div className="mt-4 font-sans">
      <CornerFrame borderClassName="border-[oklch(40%_0.1_150/0.5)]">
        <div className="overflow-hidden rounded-md border border-[oklch(40%_0.1_150/0.5)] bg-[oklch(8%_0.02_152)] shadow-2xl shadow-black/30">
          <div className="flex flex-col items-center gap-1.5 border-b border-[oklch(40%_0.1_150/0.5)] bg-[oklch(12%_0.02_150)] px-4 py-3">
            <span className={`${LOGRO_LINE_TERMINAL[tono]} w-40 max-w-full`} />
            <span className={`${LOGRO_TEXT_TERMINAL[tono]} text-[13px]`}>
              {todosAprobados ? '✦ Aceptado ✦' : '✦ Incorrecto ✦'}
            </span>
            <span className={`${LOGRO_LINE_TERMINAL[tono]} w-40 max-w-full`} />
          </div>
          <div className="flex flex-wrap gap-1.5 border-b border-[oklch(40%_0.1_150/0.5)] bg-[oklch(10%_0.02_150)] px-3 py-2">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActivo(i)}
                className={`flex cursor-pointer items-center gap-1.5 rounded-sm px-2.5 py-1 font-mono text-[12px] transition ${
                  i === activo
                    ? 'bg-[oklch(20%_0.03_150)] text-[oklch(85%_0.02_150)]'
                    : 'text-[oklch(50%_0.02_150)] hover:text-[oklch(72%_0.02_150)]'
                }`}
              >
                <span
                  className={
                    r.aprobado
                      ? 'text-[oklch(70%_0.15_152)]'
                      : 'text-[oklch(70%_0.16_25)]'
                  }
                >
                  {r.aprobado ? '✓' : '✕'}
                </span>
                Caso {i + 1}
              </button>
            ))}
          </div>
          <div className="px-4 py-3.5">
            {seleccionado.visible ? (
              <div className="flex flex-col gap-3">
                <CampoResultado
                  etiqueta="Input"
                  valor={formatearArgumentos(seleccionado.argumentos)}
                />
                {seleccionado.salidaConsola && (
                  <CampoResultado
                    etiqueta="Consola"
                    valor={seleccionado.salidaConsola}
                  />
                )}
                <CampoResultado
                  etiqueta="Obtenido"
                  valor={seleccionado.salidaObtenida || '—'}
                  error={!seleccionado.aprobado}
                />
                <CampoResultado
                  etiqueta="Esperado"
                  valor={seleccionado.salidaEsperada}
                />
                {seleccionado.salidaError && (
                  <CampoResultado
                    etiqueta="Error"
                    valor={seleccionado.salidaError}
                    error
                  />
                )}
              </div>
            ) : (
              <p className="text-[12.5px] text-[oklch(50%_0.02_150)]">
                Los detalles de este caso están ocultos.
              </p>
            )}
          </div>
        </div>
      </CornerFrame>
      {hint && (
        <p className="mt-3 rounded border border-gold-soft/40 bg-amber-soft p-2 text-sm text-amber-ink">
          💡 {hint}
        </p>
      )}
    </div>
  )
}
