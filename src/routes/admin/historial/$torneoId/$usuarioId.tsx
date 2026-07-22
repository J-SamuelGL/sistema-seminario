import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { historialParticipanteDetalleQueryOptions } from '#/server/queries/historial'
import { ProgresoParticipanteTabla } from '#/components/ProgresoParticipanteTabla'
import { ADMIN_TITLE } from '#/components/adminBrandStyles'

export const Route = createFileRoute('/admin/historial/$torneoId/$usuarioId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      historialParticipanteDetalleQueryOptions(params.usuarioId),
    ),
  component: HistorialParticipanteDetallePage,
})

function HistorialParticipanteDetallePage() {
  const { usuarioId } = Route.useParams()
  const { data } = useSuspenseQuery(
    historialParticipanteDetalleQueryOptions(usuarioId),
  )

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-8 py-8">
      <h1 className={`text-xl ${ADMIN_TITLE}`}>
        {data.participante.nombre} — {data.puntosTotales} pts — Puesto #
        {data.puesto ?? '—'}
      </h1>
      <p className="text-sm text-admin-ink-soft">{data.participante.correo}</p>
      <ProgresoParticipanteTabla
        problemas={data.problemas}
        modoEdicion={false}
      />
    </div>
  )
}
