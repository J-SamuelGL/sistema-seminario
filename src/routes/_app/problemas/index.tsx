import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { listarProblemas } from '#/server/functions/problems'
import { estadoTorneoQueryOptions } from '#/server/queries/torneo'
import { miProgresoQueryOptions } from '#/server/queries/progreso'

export const Route = createFileRoute('/_app/problemas/')({
  loader: ({ context }) =>
    Promise.all([
      listarProblemas(),
      context.queryClient.ensureQueryData(estadoTorneoQueryOptions()),
      context.queryClient.ensureQueryData(miProgresoQueryOptions()),
    ]),
  component: ProblemsListPage,
})

function ProblemsListPage() {
  const [problemas] = Route.useLoaderData()
  const { data: estado } = useSuspenseQuery(estadoTorneoQueryOptions())
  const { data: progreso } = useSuspenseQuery(miProgresoQueryOptions())

  if (!estado.iniciadoEn) {
    return <p className="p-8">El torneo aún no ha comenzado.</p>
  }

  const progresoPorProblema = new Map(
    progreso.problemas.map((p) => [p.problemaId, p]),
  )
  const cantidadResueltos = progreso.problemas.filter(
    (p) => p.estadoProgreso !== 'pendiente',
  ).length

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Problemas</h1>
      <p className="text-sm text-gray-500">
        Puedes resolverlos en cualquier orden y regresar a cualquiera en
        cualquier momento.
      </p>
      {progreso.puesto !== null && (
        <p className="mt-2 text-sm font-medium text-gray-700">
          Resueltos: {cantidadResueltos} / {problemas.length} — Faltan{' '}
          {problemas.length - cantidadResueltos} — {progreso.puntosTotales} pts
          — Puesto #{progreso.puesto}
        </p>
      )}
      <ul className="mt-4 flex flex-col gap-2">
        {problemas.map((p) => {
          const estadoProblema = progresoPorProblema.get(p.id)
          const resuelto =
            estadoProblema !== undefined &&
            estadoProblema.estadoProgreso !== 'pendiente'
          return (
            <li key={p.id}>
              <Link
                to="/problemas/$problemaId"
                params={{ problemaId: p.id }}
                className="text-blue-600"
              >
                {resuelto && '✅ '}
                {p.titulo} — {p.dificultad}
                {resuelto &&
                  estadoProblema.duracionMinutos !== null &&
                  ` (${estadoProblema.duracionMinutos} min)`}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
