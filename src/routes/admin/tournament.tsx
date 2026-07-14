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
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  async function handleStart() {
    setIsStarting(true)
    try {
      const result = await startTournament()
      setState({ id: 1, startedAt: result.startedAt })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Control del torneo</h1>
      {state.startedAt ? (
        <p>Torneo iniciado a las {new Date(state.startedAt).toLocaleTimeString()}</p>
      ) : (
        <button
          className="rounded bg-red-600 px-4 py-2 text-white"
          onClick={handleStart}
          disabled={isStarting}
        >
          {isStarting ? 'Iniciando...' : 'Iniciar torneo'}
        </button>
      )}
      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  )
}
