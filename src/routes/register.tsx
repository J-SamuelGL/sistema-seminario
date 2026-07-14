import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { setCategory } from '#/server/functions/auth'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  async function choose(category: 'senior' | 'junior') {
    try {
      await setCategory({ data: category })
      navigate({ to: '/problems' })
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
