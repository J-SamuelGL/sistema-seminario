import type { EstadisticaProblema } from '#/server/standings/estadisticasProblemas'
import type { Grupo } from '#/shared/dominio'
import { CARD_TERMINAL, PANEL_TITLE_TERMINAL } from '#/components/brandStyles'

const ETIQUETA_GRUPO: Record<Grupo, string> = {
  invitado_junior: 'Invitado / Junior',
  senior: 'Senior',
}

export function ProblemaEnLlamasPanel({
  porGrupo,
  grupoVisible,
}: {
  porGrupo: Partial<Record<Grupo, EstadisticaProblema>>
  grupoVisible: (grupo: Grupo) => boolean
}) {
  const entradas = (Object.entries(porGrupo) as [Grupo, EstadisticaProblema][]).filter(([grupo]) =>
    grupoVisible(grupo),
  )

  return (
    <div className={`${CARD_TERMINAL} p-4`}>
      <h3 className={PANEL_TITLE_TERMINAL}>Problema en llamas</h3>
      <ul className="mt-3 flex flex-col gap-2 text-[13px] text-ink-soft">
        {entradas.map(([grupo, p]) => (
          <li key={grupo}>
            <span className="text-[11px] font-bold text-ink-faint uppercase">
              {ETIQUETA_GRUPO[grupo]}
            </span>
            <br />
            <span className="text-ink">{p.titulo}</span> — {p.intentosTotales} intentos,{' '}
            {Math.round(p.tasaAciertos * 100)}% de aciertos
          </li>
        ))}
        {entradas.length === 0 && (
          <li className="text-ink-faint">Todavía no hay suficiente actividad.</li>
        )}
      </ul>
    </div>
  )
}
