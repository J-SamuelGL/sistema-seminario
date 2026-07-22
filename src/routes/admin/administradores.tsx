import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  registrarAdministrador,
  eliminarAdministrador,
} from '#/server/functions/administradores'
import { administradoresQueryOptions } from '#/server/queries/administradores'
import { datosAdministradorSchema } from '#/server/administradores/validar'
import { LoadingButton } from '#/components/LoadingButton'
import { useRegistroConCredenciales } from '#/components/useRegistroConCredenciales'
import {
  ADMIN_CARD,
  ADMIN_TITLE,
  ADMIN_INPUT_BASE,
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_DANGER,
} from '#/components/adminBrandStyles'

export const Route = createFileRoute('/admin/administradores')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(administradoresQueryOptions()),
  component: AdminAdministradoresPage,
})

function AdminAdministradoresPage() {
  const queryClient = useQueryClient()
  const { data: administradores } = useSuspenseQuery(
    administradoresQueryOptions(),
  )
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')

  const { registrados, crear, eliminar, estaEliminando } =
    useRegistroConCredenciales({
      crearFn: registrarAdministrador,
      eliminarFn: eliminarAdministrador,
      queryClient,
      queryKey: administradoresQueryOptions().queryKey,
      mensajeRegistrado: 'Administrador registrado.',
      mensajeEliminado: 'Administrador eliminado.',
      alRegistrar: () => {
        setNombre('')
        setCorreo('')
      },
    })
  const credenciales = registrados.at(0) ?? null

  return (
    <div className="mx-auto flex max-w-[800px] flex-col gap-6 px-8 py-8">
      <h1 className={`text-2xl ${ADMIN_TITLE}`}>Administradores</h1>

      <form
        className={`${ADMIN_CARD} flex flex-col gap-3 p-6`}
        onSubmit={(e) => {
          e.preventDefault()
          const validacion = datosAdministradorSchema.safeParse({
            nombre,
            correo,
          })
          if (!validacion.success) {
            toast.error(validacion.error.issues[0].message)
            return
          }
          crear.mutate(validacion.data)
        }}
      >
        <input
          className={ADMIN_INPUT_BASE}
          placeholder="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
        <input
          className={ADMIN_INPUT_BASE}
          type="email"
          placeholder="Correo"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          maxLength={255}
          required
        />
        <LoadingButton
          className={`self-start ${ADMIN_BUTTON_PRIMARY}`}
          type="submit"
          isPending={crear.isPending}
          label="Registrar administrador"
          pendingLabel="Registrando..."
        />
      </form>

      {credenciales && !credenciales.correoEnviado && (
        <p className="text-admin-gold">
          ⚠️ No se pudo enviar el correo — contraseña:{' '}
          {credenciales.contrasenaGenerada}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {administradores.map((a) => (
          <li
            key={a.id}
            className={`${ADMIN_CARD} flex items-center justify-between p-3`}
          >
            <span className="text-sm">
              <strong className="text-admin-ink">{a.nombre}</strong>{' '}
              <span className="text-admin-ink-soft">— {a.correo}</span>
            </span>
            <LoadingButton
              className={ADMIN_BUTTON_DANGER}
              disabled={eliminar.isPending}
              onClick={() => eliminar.mutate(a.id)}
              isPending={estaEliminando(a.id)}
              label="Eliminar"
              pendingLabel="Eliminando..."
              wrapperClassName="inline-flex items-center gap-1"
              spinnerClassName="h-3 w-3"
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
