import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { authClient } from '#/components/authClient'
import { LoadingButton } from '#/components/LoadingButton'
import { useToastMutation } from '#/components/useToastMutation'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')

  const iniciarSesion = useToastMutation({
    mutationFn: async (credenciales: { email: string; password: string }) => {
      const { data, error } = await authClient.signIn.email(credenciales)
      if (error) throw new Error('Correo o contraseña incorrectos.')
      return data
    },
    onSuccess: (data) => {
      const esAdmin = data.user.rol === 'admin'
      navigate({ to: esAdmin ? '/admin/participantes' : '/perfil' })
    },
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
        <LoadingButton
          className="rounded bg-blue-600 px-6 py-3 text-white disabled:bg-gray-300"
          type="submit"
          isPending={iniciarSesion.isPending}
          label="Iniciar sesión"
          pendingLabel="Ingresando..."
        />
      </form>
    </div>
  )
}
