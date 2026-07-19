import { ETIQUETAS_CATEGORIA, formatearArgumentos } from '#/components/labels'

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
  return (
    <div className="h-[70vh] overflow-y-auto p-4">
      <h1 className="text-xl font-bold">{titulo}</h1>
      <span className="text-sm uppercase text-gray-500">
        {dificultad} ·{' '}
        {ETIQUETAS_CATEGORIA[categoriaProblema] ?? categoriaProblema}
      </span>
      {resuelto && (
        <p className="mt-1 text-sm font-medium text-green-600">
          ✅ Resuelto en {resuelto.duracionMinutos} min — {resuelto.puntos} pts
        </p>
      )}
      <div className="prose mt-4 whitespace-pre-wrap">{descripcion}</div>
      {ejemplos.length > 0 && (
        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 text-left">Input</th>
              <th className="border p-2 text-left">Output</th>
            </tr>
          </thead>
          <tbody>
            {ejemplos.map((ej, i) => (
              <tr key={i}>
                <td className="border p-2">
                  <code>{formatearArgumentos(ej.argumentos)}</code>
                </td>
                <td className="border p-2">
                  <code>{ej.salidaEsperadaTexto}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
