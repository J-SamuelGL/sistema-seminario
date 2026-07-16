import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { clasificacionQueryOptions } from '#/server/queries/clasificacion'
import { LeaderboardTable } from '#/components/LeaderboardTable'

export const Route = createFileRoute('/_app/clasificacion')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(clasificacionQueryOptions()),
  component: LeaderboardPage,
})

function LeaderboardPage() {
  const { data } = useSuspenseQuery(clasificacionQueryOptions())

  if (!data.iniciado)
    return <p className="p-8">El torneo aún no ha comenzado.</p>

  return (
    <div className="grid grid-cols-3 gap-8 p-8">
      <LeaderboardTable title="Invitados" rows={data.invitado} />
      <LeaderboardTable title="Junior" rows={data.junior} />
      <LeaderboardTable title="Senior" rows={data.senior} />
    </div>
  )
}
