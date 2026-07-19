import { useModalA11y } from '#/components/useModalA11y'

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
        className="w-96 rounded bg-white p-4"
      >
        <h2 id="resuelto-titulo" className="text-lg font-bold text-green-600">
          ✅ ¡Problema resuelto!
        </h2>
        <p className="mt-2 text-sm text-gray-700">
          Lo completaste en {duracionMinutos} min — {puntos} pts.
        </p>
        <button
          className="mt-4 w-full rounded bg-green-600 px-4 py-2 text-white"
          onClick={onAceptar}
        >
          Aceptar
        </button>
      </div>
    </div>
  )
}
