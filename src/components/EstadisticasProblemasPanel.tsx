import type { EstadisticaProblema } from '#/server/standings/estadisticasProblemas'
import type { Grupo } from '#/shared/dominio'
import { CARD_TERMINAL, PANEL_TITLE_TERMINAL } from '#/components/brandStyles'

const LIMITE = 5

export function EstadisticasProblemasPanel({
  resueltosPorTodos,
  resueltosPorNadie,
  grupoVisible,
}: {
  resueltosPorTodos: EstadisticaProblema[]
  resueltosPorNadie: EstadisticaProblema[]
  grupoVisible: (grupo: Grupo) => boolean
}) {
  const todos = resueltosPorTodos.filter((p) => grupoVisible(p.grupo))
  const nadie = resueltosPorNadie.filter((p) => grupoVisible(p.grupo))

  return (
    <div className={`${CARD_TERMINAL} p-4`}>
      <h3 className={PANEL_TITLE_TERMINAL}>Resueltos por todos / por nadie</h3>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[oklch(78%_0.14_152)] uppercase">
            Por todos
          </p>
          <ul className="mt-1.5 flex flex-col gap-1 text-[13px] text-ink-soft">
            {todos.slice(0, LIMITE).map((p) => (
              <li key={p.problemaId}>{p.titulo}</li>
            ))}
            {todos.length === 0 && (
              <li className="text-ink-faint">Ninguno todavía.</li>
            )}
            {todos.length > LIMITE && (
              <li className="text-ink-faint">+{todos.length - LIMITE} más</li>
            )}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[oklch(78%_0.16_25)] uppercase">
            Por nadie
          </p>
          <ul className="mt-1.5 flex flex-col gap-1 text-[13px] text-ink-soft">
            {nadie.slice(0, LIMITE).map((p) => (
              <li key={p.problemaId}>{p.titulo}</li>
            ))}
            {nadie.length === 0 && <li className="text-ink-faint">Ninguno.</li>}
            {nadie.length > LIMITE && (
              <li className="text-ink-faint">+{nadie.length - LIMITE} más</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
