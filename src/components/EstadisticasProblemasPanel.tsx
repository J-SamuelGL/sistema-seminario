import type { CSSProperties } from 'react'
import type { EstadisticaProblema } from '#/server/standings/estadisticasProblemas'
import type { Grupo } from '#/shared/dominio'
import { PanelTablero } from '#/components/PanelTablero'
import {
  LOGRO_TEXT_NEUTRO_OSCURO,
  LOGRO_TEXT_TERMINAL,
} from '#/components/brandStyles'

const LIMITE = 5

/** Velo oscuro semitransparente por encima de la imagen de fondo: la deja
 * como marca de agua (no una foto a todo detalle) y garantiza contraste para
 * el texto claro que va encima, sea cual sea el brillo de cada imagen.
 * `velo` controla qué tan oscurecida queda la imagen debajo. */
function fondoMarcaDeAgua(url: string, velo: number): CSSProperties {
  return {
    backgroundImage: `linear-gradient(oklch(12% 0.02 85 / ${velo}), oklch(12% 0.02 85 / ${velo})), url('${url}')`,
    backgroundSize: 'cover, cover',
    backgroundPosition: 'center, center',
    backgroundRepeat: 'no-repeat, no-repeat',
    backgroundColor: 'oklch(12% 0.02 85)',
  }
}

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
    <PanelTablero titulo="Resueltos por todos / por nadie">
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          className="relative overflow-hidden rounded-sm p-3"
          style={fondoMarcaDeAgua('/tablero/por-todos-fondo.png', 0.6)}
        >
          <p className={`${LOGRO_TEXT_NEUTRO_OSCURO} text-[11px]`}>Por todos</p>
          <ul className="mt-1.5 flex flex-col gap-1 text-[13px] text-char-ink">
            {todos.slice(0, LIMITE).map((p) => (
              <li key={p.problemaId}>{p.titulo}</li>
            ))}
            {todos.length === 0 && (
              <li className="text-char-ink/60">Ninguno todavía.</li>
            )}
            {todos.length > LIMITE && (
              <li className="text-char-ink/60">+{todos.length - LIMITE} más</li>
            )}
          </ul>
        </div>
        <div
          className="relative overflow-hidden rounded-sm p-3"
          style={fondoMarcaDeAgua('/tablero/por-nadie-fondo.png', 0)}
        >
          <p className={`${LOGRO_TEXT_TERMINAL.error} text-[11px]`}>
            Por nadie
          </p>
          <ul className="mt-1.5 flex flex-col gap-1 text-[13px] text-char-ink">
            {nadie.slice(0, LIMITE).map((p) => (
              <li key={p.problemaId}>{p.titulo}</li>
            ))}
            {nadie.length === 0 && (
              <li className="text-char-ink/60">Ninguno.</li>
            )}
            {nadie.length > LIMITE && (
              <li className="text-char-ink/60">+{nadie.length - LIMITE} más</li>
            )}
          </ul>
        </div>
      </div>
    </PanelTablero>
  )
}
