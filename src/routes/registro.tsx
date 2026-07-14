import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { establecerCategoria } from '#/server/functions/auth'

export const Route = createFileRoute('/registro')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  async function choose(categoria: 'senior' | 'junior') {
    try {
      await establecerCategoria({ data: categoria })
      navigate({ to: '/problemas' })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Elige tu categoría</h1>
      <div className="flex gap-4">
        <button
          className="rounded bg-blue-600 px-6 py-3 text-white"
          onClick={() => choose('senior')}
        >
          Senior
        </button>
        <button
          className="rounded bg-green-600 px-6 py-3 text-white"
          onClick={() => choose('junior')}
        >
          Junior
        </button>
      </div>
      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  )
}
