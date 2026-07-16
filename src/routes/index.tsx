import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { createAuthClient } from 'better-auth/react'
import { toast } from 'sonner'
import { Spinner } from '#/components/Spinner'

const authClient = createAuthClient()

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')

  const iniciarSesion = useMutation({
    mutationFn: async (credenciales: { email: string; password: string }) => {
      const { data, error } = await authClient.signIn.email(credenciales)
      if (error) throw new Error('Correo o contraseña incorrectos.')
      return data
    },
    onSuccess: (data) => {
      const esAdmin = (data.user as { rol?: string }).rol === 'admin'
      navigate({ to: esAdmin ? '/admin/participantes' : '/perfil' })
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : String(err)),
  })

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    iniciarSesion.mutate({ email: correo, password: contrasena })
  }

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Torneo de Programación</h1>
      <form className="flex w-72 flex-col gap-4" onSubmit={handleLogin}>
        <p className="text-sm text-gray-500">
          Usa el correo y la contraseña que te llegaron por correo cuando te
          registraste.
        </p>
        <input
          className="border p-2"
          type="email"
          placeholder="Correo"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          maxLength={255}
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
          disabled={iniciarSesion.isPending}
        >
          {iniciarSesion.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner /> Ingresando...
            </span>
          ) : (
            'Iniciar sesión'
          )}
        </button>
      </form>
    </div>
  )
}
