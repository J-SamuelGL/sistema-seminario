import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Torneo de Programación</h1>
      <div className="flex gap-4">
        <a
          href="/api/auth/sign-in/google"
          className="rounded bg-blue-600 px-6 py-3 text-white"
        >
          Iniciar sesión con Google
        </a>
        <a
          href="/api/auth/sign-in/github"
          className="rounded bg-gray-800 px-6 py-3 text-white"
        >
          Iniciar sesión con GitHub
        </a>
      </div>
    </div>
  )
}
