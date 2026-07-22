import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { listarProblemas } from '#/server/functions/problems'
import { estadoTorneoQueryOptions } from '#/server/queries/torneo'
import { miProgresoQueryOptions } from '#/server/queries/progreso'
import { ETIQUETAS_CATEGORIA } from '#/components/labels'
import {
  CARD,
  GRADIENT_TEXT,
  PILL_BASE,
  DIFICULTAD_PILL,
} from '#/components/brandStyles'

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

  if (!estado?.iniciadoEn) {
    return <p className="p-8 text-ink-soft">El torneo aún no ha comenzado.</p>
  }

  const progresoPorProblema = new Map(
    progreso.problemas.map((p) => [p.problemaId, p]),
  )
  const cantidadResueltos = progreso.problemas.filter(
    (p) => p.estadoProgreso !== 'pendiente',
  ).length

  return (
    <div className="mx-auto max-w-[900px] px-8 py-8">
      <h1 className={`font-display text-2xl font-bold ${GRADIENT_TEXT}`}>
        Problemas
      </h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        Puedes resolverlos en cualquier orden. Una vez resuelto un problema ya
        no se puede volver a abrir.
      </p>
      {progreso.puesto !== null && (
        <p className="mt-3 text-sm font-medium text-ink">
          Resueltos: {cantidadResueltos} / {problemas.length} — Faltan{' '}
          {problemas.length - cantidadResueltos} — {progreso.puntosTotales} pts
          — Puesto #{progreso.puesto}
        </p>
      )}
      <div className={`${CARD} mt-6 divide-y divide-line/30`}>
        {problemas.map((p) => {
          const estadoProblema = progresoPorProblema.get(p.id)
          const resuelto =
            estadoProblema !== undefined &&
            estadoProblema.estadoProgreso !== 'pendiente'
          const etiquetaCategoria =
            ETIQUETAS_CATEGORIA[p.categoriaProblema] ?? p.categoriaProblema
          const pillClase =
            DIFICULTAD_PILL[p.dificultad] ?? 'bg-paper-soft text-ink-faint'
          const contenido = (
            <div className="flex items-center gap-4 px-5 py-3.5">
              <span className="w-5 font-mono text-xs text-ink-faint">
                {resuelto ? '✅' : '›'}
              </span>
              <span
                className={`flex-1 text-sm ${resuelto ? 'text-ink-soft' : 'font-medium text-ink'}`}
              >
                {p.titulo}
                <span className="ml-2 text-xs text-ink-faint">
                  {etiquetaCategoria}
                  {resuelto &&
                    estadoProblema.duracionMinutos !== null &&
                    ` · ${estadoProblema.duracionMinutos} min`}
                </span>
              </span>
              <span className={`${PILL_BASE} ${pillClase}`}>
                {p.dificultad}
              </span>
            </div>
          )
          return (
            <div key={p.id}>
              {resuelto ? (
                contenido
              ) : (
                <Link
                  to="/problemas/$problemaId"
                  params={{ problemaId: p.id }}
                  className="block transition-colors hover:bg-paper-soft"
                >
                  {contenido}
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
