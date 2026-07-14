import { createFileRoute, Link } from '@tanstack/react-router'
import { listProblems } from '#/server/functions/problems'

export const Route = createFileRoute('/admin/problems/')({
  loader: () => listProblems(),
  component: AdminProblemsList,
})

function AdminProblemsList() {
  const problems = Route.useLoaderData()
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Problemas</h1>
      <Link to="/admin/problems/$problemId" params={{ problemId: 'new' }} className="text-blue-600">
        + Nuevo problema
      </Link>
      <ul>
        {problems.map((p) => (
          <li key={p.id}>
            <Link to="/admin/problems/$problemId" params={{ problemId: p.id }}>
              {p.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
