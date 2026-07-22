import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { actualizarEstadoProgreso } from '#/server/functions/admin-respuestas'
import {
  participantesConProgresoQueryOptions,
  progresoParticipanteQueryOptions,
} from '#/server/queries/respuestas'
import { useToastMutation } from '#/components/useToastMutation'
import { ProgresoParticipanteTabla } from '#/components/ProgresoParticipanteTabla'
import { ADMIN_TITLE } from '#/components/adminBrandStyles'

export const Route = createFileRoute('/admin/respuestas/$usuarioId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      progresoParticipanteQueryOptions(params.usuarioId),
    ),
  component: AdminRespuestaDetallePage,
})

function AdminRespuestaDetallePage() {
  const { usuarioId } = Route.useParams()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(progresoParticipanteQueryOptions(usuarioId))

  const cambiarEstado = useToastMutation({
    mutationFn: (vars: {
      problemaId: string
      estadoProgreso: 'pendiente' | 'completado' | 'aprobado_manual'
    }) =>
      actualizarEstadoProgreso({
        data: {
          usuarioId,
          problemaId: vars.problemaId,
          estadoProgreso: vars.estadoProgreso,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: progresoParticipanteQueryOptions(usuarioId).queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: participantesConProgresoQueryOptions().queryKey,
      })
      toast.success('Estado actualizado.')
    },
  })

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-8 py-8">
      <h1 className={`text-xl ${ADMIN_TITLE}`}>
        {data.participante.nombre} — {data.puntosTotales} pts — Puesto #
        {data.puesto ?? '—'}
      </h1>
      <ProgresoParticipanteTabla
        problemas={data.problemas}
        modoEdicion
        cambiandoEstadoProblemaId={
          cambiarEstado.isPending ? cambiarEstado.variables.problemaId : null
        }
        onCambiarEstado={(problemaId, estadoProgreso) =>
          cambiarEstado.mutate({ problemaId, estadoProgreso })
        }
      />
    </div>
  )
}
