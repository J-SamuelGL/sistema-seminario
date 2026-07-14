import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { obtenerClasificacion } from '#/server/functions/leaderboard'
import { LeaderboardTable } from '#/components/LeaderboardTable'

export const Route = createFileRoute('/clasificacion')({
  loader: () => obtenerClasificacion(),
  component: LeaderboardPage,
})

function LeaderboardPage() {
  const initial = Route.useLoaderData()
  const [data, setData] = useState(initial)

  useEffect(() => {
    const interval = setInterval(() => {
      obtenerClasificacion()
        .then(setData)
        .catch(() => {
          // Ignore transient polling errors; the next interval tick will retry.
        })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  if (!data.iniciado) return <p className="p-8">El torneo aún no ha comenzado.</p>

  return (
    <div className="grid grid-cols-3 gap-8 p-8">
      <LeaderboardTable title="Invitados" rows={data.invitado} />
      <LeaderboardTable title="Junior" rows={data.junior} />
      <LeaderboardTable title="Senior" rows={data.senior} />
    </div>
  )
}
