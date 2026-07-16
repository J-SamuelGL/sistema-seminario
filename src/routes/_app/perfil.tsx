import { createFileRoute, redirect } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { usuarioActualQueryOptions } from '#/server/queries/usuarioActual'
import { QrCode } from '#/components/QrCode'

export const Route = createFileRoute('/_app/perfil')({
  loader: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      usuarioActualQueryOptions(),
    )
    if (user.rol === 'admin') {
      throw redirect({ to: '/admin/participantes' })
    }
  },
  component: ProfilePage,
})

function ProfilePage() {
  const { data: user } = useSuspenseQuery(usuarioActualQueryOptions())
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h1 className="text-xl font-bold">Hola, {user.name}</h1>
      <p>Muestra este código al llegar al evento para hacer check-in:</p>
      <QrCode value={user.tokenIngreso} />
      <p>
        {user.ingresadoEn
          ? 'Ya hiciste check-in ✅'
          : 'Aún no has hecho check-in'}
      </p>
    </div>
  )
}
