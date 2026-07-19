import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { iniciarTorneo, concluirTorneo } from '#/server/functions/tournament'
import { estadoTorneoQueryOptions } from '#/server/queries/torneo'
import { LoadingButton } from '#/components/LoadingButton'
import { useToastMutation } from '#/components/useToastMutation'

export const Route = createFileRoute('/admin/torneo')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(estadoTorneoQueryOptions()),
  component: TournamentControlPage,
})

function TournamentControlPage() {
  const queryClient = useQueryClient()
  const { data: estado } = useSuspenseQuery(estadoTorneoQueryOptions())

  const iniciar = useToastMutation({
    mutationFn: () => iniciarTorneo(),
    onSuccess: (resultado) => {
      queryClient.setQueryData(estadoTorneoQueryOptions().queryKey, {
        id: 1,
        iniciadoEn: resultado.iniciadoEn,
        finalizadoEn: null,
      })
      toast.success('Torneo iniciado.')
    },
  })

  const concluir = useToastMutation({
    mutationFn: () => concluirTorneo(),
    onSuccess: (resultado) => {
      queryClient.setQueryData(estadoTorneoQueryOptions().queryKey, {
        ...estado,
        finalizadoEn: resultado.finalizadoEn,
      })
      toast.success('Torneo concluido.')
    },
  })

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Control del torneo</h1>
      {estado.finalizadoEn ? (
        <p>
          Torneo concluido a las{' '}
          {new Date(estado.finalizadoEn).toLocaleTimeString()}
        </p>
      ) : estado.iniciadoEn ? (
        <div>
          <p>
            Torneo iniciado a las{' '}
            {new Date(estado.iniciadoEn).toLocaleTimeString()}
          </p>
          <LoadingButton
            className="mt-4 rounded bg-red-600 px-4 py-2 text-white"
            onClick={() => concluir.mutate()}
            isPending={concluir.isPending}
            label="Concluir torneo"
            pendingLabel="Concluyendo..."
          />
        </div>
      ) : (
        <LoadingButton
          className="rounded bg-red-600 px-4 py-2 text-white"
          onClick={() => iniciar.mutate()}
          isPending={iniciar.isPending}
          label="Iniciar torneo"
          pendingLabel="Iniciando..."
        />
      )}
    </div>
  )
}
