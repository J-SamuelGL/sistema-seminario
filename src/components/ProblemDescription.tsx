export function ProblemDescription({
  titulo,
  descripcion,
  dificultad,
}: {
  titulo: string
  descripcion: string
  dificultad: string
}) {
  return (
    <div className="h-[70vh] overflow-y-auto p-4">
      <h1 className="text-xl font-bold">{titulo}</h1>
      <span className="text-sm uppercase text-gray-500">{dificultad}</span>
      <div className="prose mt-4 whitespace-pre-wrap">{descripcion}</div>
    </div>
  )
}
