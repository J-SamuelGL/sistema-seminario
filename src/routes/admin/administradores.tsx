import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { registrarAdministrador, eliminarAdministrador } from '#/server/functions/administradores'
import { administradoresQueryOptions } from '#/server/queries/administradores'
import { datosAdministradorSchema } from '#/server/administradores/validar'
import { Spinner } from '#/components/Spinner'

export const Route = createFileRoute('/admin/administradores')({
  loader: ({ context }) => context.queryClient.ensureQueryData(administradoresQueryOptions()),
  component: AdminAdministradoresPage,
})

function AdminAdministradoresPage() {
  const queryClient = useQueryClient()
  const { data: administradores } = useSuspenseQuery(administradoresQueryOptions())
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [credenciales, setCredenciales] = useState<
    { correoEnviado: boolean; contrasenaGenerada: string } | null
  >(null)

  const crear = useMutation({
    mutationFn: (input: { nombre: string; correo: string }) => registrarAdministrador({ data: input }),
    onSuccess: (resultado) => {
      setCredenciales(resultado)
      setNombre('')
      setCorreo('')
      queryClient.invalidateQueries({ queryKey: administradoresQueryOptions().queryKey })
      toast.success('Administrador registrado.')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  })

  const eliminar = useMutation({
    mutationFn: (usuarioId: string) => eliminarAdministrador({ data: usuarioId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: administradoresQueryOptions().queryKey })
      toast.success('Administrador eliminado.')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  })

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-xl font-bold">Administradores</h1>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const validacion = datosAdministradorSchema.safeParse({ nombre, correo })
          if (!validacion.success) {
            toast.error(validacion.error.issues[0].message)
            return
          }
          crear.mutate(validacion.data)
        }}
      >
        <input
          className="border p-2"
          placeholder="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
        <input
          className="border p-2"
          type="email"
          placeholder="Correo"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          maxLength={255}
          required
        />
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:bg-gray-300"
          type="submit"
          disabled={crear.isPending}
        >
          {crear.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner /> Registrando...
            </span>
          ) : (
            'Registrar administrador'
          )}
        </button>
      </form>

      {credenciales && !credenciales.correoEnviado && (
        <p className="text-yellow-600">
          ⚠️ No se pudo enviar el correo — contraseña: {credenciales.contrasenaGenerada}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {administradores.map((a) => (
          <li key={a.id} className="flex items-center justify-between border p-2">
            <span>
              <strong>{a.nombre}</strong> — {a.correo}
            </span>
            <button
              className="text-red-600 underline disabled:text-gray-400"
              disabled={eliminar.isPending}
              onClick={() => eliminar.mutate(a.id)}
            >
              {eliminar.isPending && eliminar.variables === a.id ? (
                <span className="inline-flex items-center gap-1">
                  <Spinner className="h-3 w-3" /> Eliminando...
                </span>
              ) : (
                'Eliminar'
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
