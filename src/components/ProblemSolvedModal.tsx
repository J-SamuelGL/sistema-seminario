import { useModalA11y } from '#/components/useModalA11y'
import { CARD, BUTTON_PRIMARY, GRADIENT_TEXT } from '#/components/brandStyles'

export function ProblemSolvedModal({
  duracionMinutos,
  puntos,
  onAceptar,
}: {
  duracionMinutos: number
  puntos: number
  onAceptar: () => void
}) {
  // Sin cierre por Escape ni click afuera: "Aceptar" es la única salida a
  // propósito, para forzar a avanzar al siguiente problema (o a la lista).
  const modalRef = useModalA11y({ closeOnEscape: false })

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resuelto-titulo"
        className={`${CARD} w-96 p-6`}
      >
        <h2
          id="resuelto-titulo"
          className={`font-display text-lg font-bold ${GRADIENT_TEXT}`}
        >
          ✅ ¡Problema resuelto!
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Lo completaste en {duracionMinutos} min — {puntos} pts.
        </p>
        <button className={`mt-4 w-full ${BUTTON_PRIMARY}`} onClick={onAceptar}>
          Aceptar
        </button>
      </div>
    </div>
  )
}
