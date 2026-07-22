import { createFileRoute, redirect } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { usuarioActualQueryOptions } from '#/server/queries/usuarioActual'
import { QrCode } from '#/components/QrCode'
import { CornerFrame } from '#/components/CornerFrame'
import { CARD, GRADIENT_TEXT, PILL_BASE } from '#/components/brandStyles'

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
    <div className="mx-auto max-w-[560px] px-6 py-10">
      <div
        className={`${CARD} flex flex-col items-center gap-4 p-8 text-center`}
      >
        <h1 className={`font-display text-xl font-bold ${GRADIENT_TEXT}`}>
          Hola, {user.name}
        </h1>
        <p className="text-[14px] text-ink-soft">
          Muestra este código al llegar al evento para hacer check-in:
        </p>
        <CornerFrame className="rounded bg-paper-soft p-4">
          <QrCode value={user.tokenIngreso} />
        </CornerFrame>
        <span
          className={`${PILL_BASE} ${user.ingresadoEn ? 'bg-laurel-soft text-laurel-ink' : 'border border-line text-ink-faint'}`}
        >
          {user.ingresadoEn
            ? '✅ Ya hiciste check-in'
            : 'Aún no has hecho check-in'}
        </span>
      </div>
    </div>
  )
}
