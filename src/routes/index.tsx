import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createAuthClient } from 'better-auth/react'

const authClient = createAuthClient()

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    const { data, error: errorLogin } = await authClient.signIn.email({
      email: correo,
      password: contrasena,
    })
    setEnviando(false)
    if (errorLogin) {
      setError('Correo o contraseña incorrectos.')
      return
    }
    const esAdmin = (data.user as { rol?: string }).rol === 'admin'
    await navigate({ to: esAdmin ? '/admin/participantes' : '/perfil' })
  }

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Torneo de Programación</h1>
      <form className="flex w-72 flex-col gap-4" onSubmit={handleLogin}>
        <p className="text-sm text-gray-500">
          Usa el correo y la contraseña que te llegaron por correo cuando te registraste.
        </p>
        <input
          className="border p-2"
          type="email"
          placeholder="Correo"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
        />
        <input
          className="border p-2"
          type="password"
          placeholder="Contraseña"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          required
        />
        <button
          className="rounded bg-blue-600 px-6 py-3 text-white disabled:bg-gray-300"
          type="submit"
          disabled={enviando}
        >
          {enviando ? 'Ingresando...' : 'Iniciar sesión'}
        </button>
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </div>
  )
}
