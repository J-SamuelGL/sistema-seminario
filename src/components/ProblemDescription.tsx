import { ETIQUETAS_CATEGORIA, formatearArgumentos } from '#/components/labels'
import {
  GRADIENT_TEXT,
  PILL_BASE,
  DIFICULTAD_PILL,
  OUTLINE_PILL,
} from '#/components/brandStyles'

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
  const pillClase =
    DIFICULTAD_PILL[dificultad] ?? 'bg-paper-soft text-ink-faint'

  return (
    <div className="h-[70vh] overflow-y-auto pr-2">
      <h1 className={`font-display text-2xl font-bold ${GRADIENT_TEXT}`}>
        {titulo}
      </h1>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <span className={`${PILL_BASE} ${pillClase}`}>{dificultad}</span>
        <span className={OUTLINE_PILL}>
          {ETIQUETAS_CATEGORIA[categoriaProblema] ?? categoriaProblema}
        </span>
      </div>
      {resuelto && (
        <p className="mt-2 text-sm font-medium text-laurel-ink">
          ✅ Resuelto en {resuelto.duracionMinutos} min — {resuelto.puntos} pts
        </p>
      )}
      <div className="prose prose-sm mt-4 max-w-none whitespace-pre-wrap text-ink">
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
              className="grid grid-cols-2 border-b border-line/30 last:border-b-0"
            >
              <div className="border-r border-line/30 px-3.5 py-2.5 font-mono text-[13.5px] text-ink-soft">
                <code>{formatearArgumentos(ej.argumentos)}</code>
              </div>
              <div className="px-3.5 py-2.5 font-mono text-[13.5px] text-ink-soft">
                <code>{ej.salidaEsperadaTexto}</code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
