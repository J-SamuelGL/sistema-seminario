export function ProblemDescription({
  title,
  description,
  difficulty,
}: {
  title: string
  description: string
  difficulty: string
}) {
  return (
    <div className="h-[70vh] overflow-y-auto p-4">
      <h1 className="text-xl font-bold">{title}</h1>
      <span className="text-sm uppercase text-gray-500">{difficulty}</span>
      <div className="prose mt-4 whitespace-pre-wrap">{description}</div>
    </div>
  )
}
