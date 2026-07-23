import { ETIQUETAS_CATEGORIA, formatearArgumentos } from '#/components/labels'
import {
  GRADIENT_TEXT,
  DIFICULTAD_PILL,
  CATEGORIA_PILL_TERMINAL,
} from '#/components/brandStyles'
import { BrandDivider } from '#/components/BrandDivider'
import { LogroBanner } from '#/components/LogroBanner'

export function ProblemDescription({
  titulo,
  descripcion,
  dificultad,
  categoriaProblema,
  ejemplos,
  resuelto,
}: {
  titulo: string
  descripcion: string
  dificultad: string
  categoriaProblema: string
  ejemplos: { argumentos: unknown[]; salidaEsperadaTexto: string }[]
  resuelto?: { duracionMinutos: number; puntos: number } | null
}) {
  const pillClase = DIFICULTAD_PILL[dificultad] ?? CATEGORIA_PILL_TERMINAL

  return (
    <div className="h-[70vh] overflow-y-auto pr-2">
      <h1 className={`font-display text-4xl font-bold ${GRADIENT_TEXT}`}>
        {titulo}
      </h1>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <span className={pillClase}>{dificultad}</span>
        <span className={CATEGORIA_PILL_TERMINAL}>
          {ETIQUETAS_CATEGORIA[categoriaProblema] ?? categoriaProblema}
        </span>
      </div>
      {resuelto && (
        <div className="mt-2">
          <LogroBanner>
            Resuelto en {resuelto.duracionMinutos} min — {resuelto.puntos} pts
          </LogroBanner>
        </div>
      )}
      <div className="mt-4 mb-1">
        <BrandDivider />
      </div>
      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-ink">
        {descripcion}
      </div>
      {ejemplos.length > 0 && (
        <div className="mt-4 overflow-hidden rounded border border-line/60">
          <div className="grid grid-cols-2 border-b border-line/60 bg-paper-soft">
            <div className="border-r border-line/60 px-3.5 py-2 text-xs font-bold tracking-wide text-gold-label uppercase">
              Input
            </div>
            <div className="px-3.5 py-2 text-xs font-bold tracking-wide text-gold-label uppercase">
              Output
            </div>
          </div>
          {ejemplos.map((ej, i) => (
            <div
              key={i}
              className="group grid grid-cols-2 border-b border-line/30 transition-colors last:border-b-0 hover:bg-[linear-gradient(90deg,color-mix(in_oklch,var(--color-laurel-soft)_55%,transparent)_0%,transparent_70%)]"
            >
              <div className="border-r border-line/30 px-3.5 py-2.5 font-mono text-[13.5px] text-ink-soft">
                <code>{formatearArgumentos(ej.argumentos)}</code>
              </div>
              <div className="px-3.5 py-2.5 font-mono text-[13.5px] font-semibold text-ink-soft transition-colors group-hover:text-laurel-ink">
                <code>{ej.salidaEsperadaTexto}</code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
