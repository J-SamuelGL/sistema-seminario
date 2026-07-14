import { createFileRoute, Link } from '@tanstack/react-router'
import { listProblems } from '#/server/functions/problems'

export const Route = createFileRoute('/problems/')({
  loader: () => listProblems(),
  component: ProblemsListPage,
})

function ProblemsListPage() {
  const problems = Route.useLoaderData()
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Problemas</h1>
      <p className="text-sm text-gray-500">
        Puedes resolverlos en cualquier orden y regresar a cualquiera en cualquier momento.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {problems.map((p) => (
          <li key={p.id}>
            <Link to="/problems/$problemId" params={{ problemId: p.id }} className="text-blue-600">
              {p.title} — {p.difficulty}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
