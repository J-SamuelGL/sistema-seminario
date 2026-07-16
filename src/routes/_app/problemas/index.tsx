import { createFileRoute, Link } from '@tanstack/react-router'
import { listarProblemas } from '#/server/functions/problems'

export const Route = createFileRoute('/_app/problemas/')({
  loader: () => listarProblemas(),
  component: ProblemsListPage,
})

function ProblemsListPage() {
  const problemas = Route.useLoaderData()
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Problemas</h1>
      <p className="text-sm text-gray-500">
        Puedes resolverlos en cualquier orden y regresar a cualquiera en
        cualquier momento.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {problemas.map((p) => (
          <li key={p.id}>
            <Link
              to="/problemas/$problemaId"
              params={{ problemaId: p.id }}
              className="text-blue-600"
            >
              {p.titulo} — {p.dificultad}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
