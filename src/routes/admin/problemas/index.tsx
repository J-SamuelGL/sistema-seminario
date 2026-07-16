import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { problemasQueryOptions } from '#/server/queries/problemas'

export const Route = createFileRoute('/admin/problemas/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(problemasQueryOptions()),
  component: AdminProblemsList,
})

function AdminProblemsList() {
  const { data: problemas } = useSuspenseQuery(problemasQueryOptions())
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
