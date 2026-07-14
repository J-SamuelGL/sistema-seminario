import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getTournamentState, startTournament } from '#/server/functions/tournament'

export const Route = createFileRoute('/admin/tournament')({
  loader: () => getTournamentState(),
  component: TournamentControlPage,
})

function TournamentControlPage() {
  const initial = Route.useLoaderData()
  const [state, setState] = useState(initial)

  async function handleStart() {
    const result = await startTournament()
    setState({ id: 1, startedAt: result.startedAt })
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Control del torneo</h1>
      {state.startedAt ? (
        <p>Torneo iniciado a las {new Date(state.startedAt).toLocaleTimeString()}</p>
      ) : (
        <button className="rounded bg-red-600 px-4 py-2 text-white" onClick={handleStart}>
          Iniciar torneo
        </button>
      )}
    </div>
  )
}
