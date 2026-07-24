import type { EstadisticaProblema } from '#/server/standings/estadisticasProblemas'
import type { Grupo } from '#/shared/dominio'
import { PanelTablero } from '#/components/PanelTablero'
import { LOGRO_TEXT_NEUTRO_OSCURO } from '#/components/brandStyles'

const ETIQUETA_GRUPO: Record<Grupo, string> = {
  invitado_junior: 'Invitado / Junior',
  senior: 'Senior',
}

/** Barra de vida de jefe (referencia: HUD de Elden Ring): la "vida restante"
 * es 1 - tasaAciertos, no la tasa de aciertos en sí — un problema que casi
 * nadie resuelve todavía está "casi entero", uno que la mayoría ya resolvió
 * está "casi muerto". Las puntas doradas en punta simulan los remates
 * ornamentados de la barra de referencia; el degradado claro/oscuro sobre el
 * rojo le da el brillo apenas convexo de la barra original. */
function BarraVidaJefe({ tasaAciertos }: { tasaAciertos: number }) {
  const vidaPct = Math.round((1 - tasaAciertos) * 100)
  return (
    <div className="mt-2 flex items-center">
      <span className="h-3 w-2 shrink-0 bg-brass-1 [clip-path:polygon(100%_0,100%_100%,0_50%)]" />
      <div className="relative h-3 flex-1 overflow-hidden border-y border-brass-1/80 bg-black">
        <span
          className="absolute inset-y-0 left-0 bg-gradient-to-b from-red-500 via-red-700 to-red-900"
          style={{ width: `${vidaPct}%` }}
        />
        <span className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-black/30" />
      </div>
      <span className="h-3 w-2 shrink-0 bg-brass-1 [clip-path:polygon(0_0,0_100%,100%_50%)]" />
    </div>
  )
}

export function ProblemaEnLlamasPanel({
  porGrupo,
  grupoVisible,
}: {
  porGrupo: Partial<Record<Grupo, EstadisticaProblema>>
  grupoVisible: (grupo: Grupo) => boolean
}) {
  const entradas = (
    Object.entries(porGrupo) as [Grupo, EstadisticaProblema][]
  ).filter(([grupo]) => grupoVisible(grupo))

  return (
    <PanelTablero titulo="Problema en llamas">
      <ul className="mt-3 flex flex-col gap-2.5 text-[13px]">
        {entradas.map(([grupo, p]) => (
          <li key={grupo} className="rounded-sm bg-char px-3 py-2.5">
            <p className="text-center text-[10px] font-bold tracking-wide text-char-ink/60 uppercase">
              {ETIQUETA_GRUPO[grupo]}
            </p>
            <p
              className={`${LOGRO_TEXT_NEUTRO_OSCURO} mt-0.5 text-center text-[12px]`}
            >
              {p.titulo}
            </p>
            <BarraVidaJefe tasaAciertos={p.tasaAciertos} />
            <p className="mt-1.5 text-center text-[10.5px] text-char-ink/60">
              {p.intentosTotales} intentos, {Math.round(p.tasaAciertos * 100)}%
              de aciertos
            </p>
          </li>
        ))}
        {entradas.length === 0 && (
          <li className="text-ink-faint">
            Todavía no hay suficiente actividad.
          </li>
        )}
      </ul>
    </PanelTablero>
  )
}
