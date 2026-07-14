import { createFileRoute } from '@tanstack/react-router'
import { getMe } from '#/server/functions/auth'
import { QrCode } from '#/components/QrCode'

export const Route = createFileRoute('/profile')({
  loader: () => getMe(),
  component: ProfilePage,
})

function ProfilePage() {
  const user = Route.useLoaderData()
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h1 className="text-xl font-bold">Hola, {user.name}</h1>
      <p>Muestra este código al llegar al evento para hacer check-in:</p>
      <QrCode value={user.checkinToken} />
      <p>
        {user.checkedInAt
          ? 'Ya hiciste check-in ✅'
          : 'Aún no has hecho check-in'}
      </p>
    </div>
  )
}
