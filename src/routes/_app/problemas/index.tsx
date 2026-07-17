import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { listarProblemas } from '#/server/functions/problems'
import { estadoTorneoQueryOptions } from '#/server/queries/torneo'

export const Route = createFileRoute('/_app/problemas/')({
  loader: ({ context }) =>
    Promise.all([
      listarProblemas(),
      context.queryClient.ensureQueryData(estadoTorneoQueryOptions()),
    ]),
  component: ProblemsListPage,
})

function ProblemsListPage() {
  const [problemas] = Route.useLoaderData()
  const { data: estado } = useSuspenseQuery(estadoTorneoQueryOptions())

  if (!estado.iniciadoEn) {
    return <p className="p-8">El torneo aún no ha comenzado.</p>
  }

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
