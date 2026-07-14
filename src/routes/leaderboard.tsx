import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getStandings } from '#/server/functions/leaderboard'
import { LeaderboardTable } from '#/components/LeaderboardTable'

export const Route = createFileRoute('/leaderboard')({
  loader: () => getStandings(),
  component: LeaderboardPage,
})

function LeaderboardPage() {
  const initial = Route.useLoaderData()
  const [data, setData] = useState(initial)

  useEffect(() => {
    const interval = setInterval(() => {
      getStandings()
        .then(setData)
        .catch(() => {
          // Ignore transient polling errors; the next interval tick will retry.
        })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  if (!data.started) return <p className="p-8">El torneo aún no ha comenzado.</p>

  return (
    <div className="grid grid-cols-2 gap-8 p-8">
      <LeaderboardTable title="Senior" rows={data.senior} />
      <LeaderboardTable title="Junior" rows={data.junior} />
    </div>
  )
}
