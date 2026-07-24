import { createFileRoute, redirect } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { usuarioActualQueryOptions } from '#/server/queries/usuarioActual'
import { beneficioPropioQueryOptions } from '#/server/queries/beneficioPropio'
import { QrCode } from '#/components/QrCode'
import { CornerFrame } from '#/components/CornerFrame'
import { LogroBanner } from '#/components/LogroBanner'
import { BeneficioIcono } from '#/components/BeneficioIcono'
import { CARD, GRADIENT_TEXT, PILL_BASE } from '#/components/brandStyles'
import { CATALOGO_BENEFICIOS, rutaIconoBeneficio } from '#/shared/beneficios'

export const Route = createFileRoute('/_app/perfil')({
  loader: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      usuarioActualQueryOptions(),
    )
    if (user.rol === 'admin') {
      throw redirect({ to: '/admin/participantes' })
    }
    await context.queryClient.ensureQueryData(beneficioPropioQueryOptions())
  },
  component: ProfilePage,
})

function ProfilePage() {
  const { data: user } = useSuspenseQuery(usuarioActualQueryOptions())
  const { data: beneficio } = useSuspenseQuery(beneficioPropioQueryOptions())

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-6 px-6 py-10">
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
        {user.ingresadoEn ? (
          <LogroBanner>✦ Ya hiciste check-in ✦</LogroBanner>
        ) : (
          <span className={`${PILL_BASE} border border-line text-ink-faint`}>
            Aún no has hecho check-in
          </span>
        )}
      </div>

      {beneficio && (
        <div
          className={`${CARD} flex flex-col items-center gap-3 p-6 text-center`}
        >
          <h2 className={`font-display text-lg font-bold ${GRADIENT_TEXT}`}>
            Tu ventaja/desventaja
          </h2>
          {rutaIconoBeneficio(beneficio.clave) && (
            <CornerFrame
              className="rounded bg-paper-soft p-1"
              borderClassName="border-brass-1/70"
            >
              <BeneficioIcono clave={beneficio.clave} size="lg" />
            </CornerFrame>
          )}
          <p className="text-[14px] text-ink-soft">
            {CATALOGO_BENEFICIOS[beneficio.clave].texto}
          </p>
          {beneficio.usadoEn ? (
            <LogroBanner>✦ Ya se aplicó ✦</LogroBanner>
          ) : (
            <span className={`${PILL_BASE} border border-line text-ink-faint`}>
              Aún no se ha aplicado
            </span>
          )}
        </div>
      )}
    </div>
  )
}
