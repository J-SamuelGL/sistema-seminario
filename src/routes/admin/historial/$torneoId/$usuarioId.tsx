import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { historialParticipanteDetalleQueryOptions } from '#/server/queries/historial'
import { ProgresoParticipanteTabla } from '#/components/ProgresoParticipanteTabla'

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
    <div className="flex flex-col gap-4 p-8">
      <h1 className="text-xl font-bold">
        {data.participante.nombre} — {data.puntosTotales} pts — Puesto #
        {data.puesto ?? '—'}
      </h1>
      <ProgresoParticipanteTabla
        problemas={data.problemas}
        modoEdicion={false}
      />
    </div>
  )
}
