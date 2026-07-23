import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { clasificacionQueryOptions } from '#/server/queries/clasificacion'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'
import { LeaderboardTable } from '#/components/LeaderboardTable'
import { GRADIENT_TEXT } from '#/components/brandStyles'
import { BrandDivider } from '#/components/BrandDivider'

export const Route = createFileRoute('/clasificacion')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(clasificacionQueryOptions()),
      context.queryClient.ensureQueryData(usuarioActualOpcionalQueryOptions()),
    ]),
  component: LeaderboardPage,
})

function LeaderboardPage() {
  const { data } = useSuspenseQuery(clasificacionQueryOptions())
  const { data: usuario } = useSuspenseQuery(usuarioActualOpcionalQueryOptions())

  if (!data.iniciado)
    return <p className="p-8 text-ink-soft">El torneo aún no ha comenzado.</p>

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-8">
      <h1 className={`font-display text-2xl font-bold tracking-wide uppercase ${GRADIENT_TEXT}`}>
        Tabla de Clasificación
      </h1>
      <div className="mt-2 mb-6 flex items-center gap-3">
        <BrandDivider />
        <p className="text-sm text-ink-soft italic">Puntos acumulados por problemas resueltos</p>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <LeaderboardTable title="Invitados" rows={data.invitado} usuarioActualId={usuario?.id} />
        <LeaderboardTable title="Junior" rows={data.junior} usuarioActualId={usuario?.id} />
        <LeaderboardTable title="Senior" rows={data.senior} usuarioActualId={usuario?.id} />
      </div>
    </div>
  )
}
