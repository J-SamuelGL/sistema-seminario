import { createFileRoute, Link } from '@tanstack/react-router'
import { listarProblemas } from '#/server/functions/problems'

export const Route = createFileRoute('/admin/problemas/')({
  loader: () => listarProblemas(),
  component: AdminProblemsList,
})

function AdminProblemsList() {
  const problemas = Route.useLoaderData()
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Problemas</h1>
      <Link to="/admin/problemas/$problemaId" params={{ problemaId: 'new' }} className="text-blue-600">
        + Nuevo problema
      </Link>
      <ul>
        {problemas.map((p) => (
          <li key={p.id}>
            <Link to="/admin/problemas/$problemaId" params={{ problemaId: p.id }}>
              {p.titulo}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
