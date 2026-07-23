import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { listarProblemas } from '#/server/functions/problems'
import { estadoTorneoQueryOptions } from '#/server/queries/torneo'
import { miProgresoQueryOptions } from '#/server/queries/progreso'
import { ETIQUETAS_CATEGORIA } from '#/components/labels'
import {
  CARD,
  GRADIENT_TEXT,
  DIFICULTAD_PILL,
  CATEGORIA_PILL_TERMINAL,
  DURACION_PILL_TERMINAL,
  KPI_TILE,
  KPI_TILE_HIGHLIGHT,
  KPI_TILE_LABEL,
  KPI_TILE_VALUE,
  KPI_TILE_VALUE_HIGHLIGHT,
  ROW_INTERACTIVE,
  ROW_MARKER_INTERACTIVE,
  ROW_TITLE_HOVER_GRADIENT,
  LOGRO_TEXT,
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
        <div className="mt-4 flex overflow-hidden rounded-sm border border-line/60">
          <div className={KPI_TILE}>
            <div className={KPI_TILE_LABEL}>Resueltos</div>
            <div className={KPI_TILE_VALUE}>
              {cantidadResueltos} / {problemas.length}
            </div>
          </div>
          <div className={KPI_TILE}>
            <div className={KPI_TILE_LABEL}>Faltan</div>
            <div className={KPI_TILE_VALUE}>
              {problemas.length - cantidadResueltos}
            </div>
          </div>
          <div className={KPI_TILE}>
            <div className={KPI_TILE_LABEL}>Puntos</div>
            <div className={KPI_TILE_VALUE}>{progreso.puntosTotales}</div>
          </div>
          <div className={KPI_TILE_HIGHLIGHT}>
            <div className={KPI_TILE_LABEL}>Puesto</div>
            <div className={KPI_TILE_VALUE_HIGHLIGHT}>#{progreso.puesto}</div>
          </div>
        </div>
      )}
      <div className={`${CARD} mt-6 divide-y divide-line/30`}>
        {problemas.map((p) => {
          const estadoProblema = progresoPorProblema.get(p.id)
          const resuelto =
            estadoProblema !== undefined &&
            estadoProblema.estadoProgreso !== 'pendiente'
          const etiquetaCategoria =
            ETIQUETAS_CATEGORIA[p.categoriaProblema] ?? p.categoriaProblema
          const pillClase = DIFICULTAD_PILL[p.dificultad] ?? CATEGORIA_PILL_TERMINAL
          if (resuelto) {
            return (
              <div
                key={p.id}
                className="flex items-center gap-4 border-l-[3px] border-transparent px-5 py-3.5"
              >
                <span className={`${LOGRO_TEXT} shrink-0 text-[9.5px] whitespace-nowrap`}>
                  ✦ Resuelto ✦
                </span>
                <span className="flex-1 text-sm text-ink-soft">
                  {p.titulo}
                  <span className="ml-2 inline-flex items-center gap-1.5">
                    <span className={CATEGORIA_PILL_TERMINAL}>
                      {etiquetaCategoria}
                    </span>
                    {estadoProblema.duracionMinutos !== null && (
                      <span className={DURACION_PILL_TERMINAL}>
                        {estadoProblema.duracionMinutos} min
                      </span>
                    )}
                  </span>
                </span>
                <span className={pillClase}>{p.dificultad}</span>
              </div>
            )
          }
          return (
            <Link
              key={p.id}
              to="/problemas/$problemaId"
              params={{ problemaId: p.id }}
              className={ROW_INTERACTIVE}
            >
              <span
                className={`w-4 text-center font-mono text-xs ${ROW_MARKER_INTERACTIVE}`}
              >
                ✦
              </span>
              <span
                className={`flex-1 text-sm font-medium text-ink ${ROW_TITLE_HOVER_GRADIENT}`}
              >
                {p.titulo}
                <span className="ml-2 inline-flex">
                  <span className={CATEGORIA_PILL_TERMINAL}>
                    {etiquetaCategoria}
                  </span>
                </span>
              </span>
              <span className={pillClase}>{p.dificultad}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
