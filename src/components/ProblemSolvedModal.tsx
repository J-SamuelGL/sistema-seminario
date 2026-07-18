export function ProblemSolvedModal({
  duracionMinutos,
  puntos,
  onAceptar,
}: {
  duracionMinutos: number
  puntos: number
  onAceptar: () => void
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
      <div className="w-96 rounded bg-white p-4">
        <h2 className="text-lg font-bold text-green-600">
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
