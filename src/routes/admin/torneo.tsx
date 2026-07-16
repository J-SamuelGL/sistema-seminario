import { createFileRoute } from '@tanstack/react-router'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { iniciarTorneo, concluirTorneo } from '#/server/functions/tournament'
import { estadoTorneoQueryOptions } from '#/server/queries/torneo'
import { Spinner } from '#/components/Spinner'

export const Route = createFileRoute('/admin/torneo')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(estadoTorneoQueryOptions()),
  component: TournamentControlPage,
})

function TournamentControlPage() {
  const queryClient = useQueryClient()
  const { data: estado } = useSuspenseQuery(estadoTorneoQueryOptions())

  const iniciar = useMutation({
    mutationFn: () => iniciarTorneo(),
    onSuccess: (resultado) => {
      queryClient.setQueryData(estadoTorneoQueryOptions().queryKey, {
        id: 1,
        iniciadoEn: resultado.iniciadoEn,
        finalizadoEn: null,
      })
      toast.success('Torneo iniciado.')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : String(err)),
  })

  const concluir = useMutation({
    mutationFn: () => concluirTorneo(),
    onSuccess: (resultado) => {
      queryClient.setQueryData(estadoTorneoQueryOptions().queryKey, {
        ...estado,
        finalizadoEn: resultado.finalizadoEn,
      })
      toast.success('Torneo concluido.')
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : String(err)),
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
          <button
            className="mt-4 rounded bg-red-600 px-4 py-2 text-white"
            onClick={() => concluir.mutate()}
            disabled={concluir.isPending}
          >
            {concluir.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> Concluyendo...
              </span>
            ) : (
              'Concluir torneo'
            )}
          </button>
        </div>
      ) : (
        <button
          className="rounded bg-red-600 px-4 py-2 text-white"
          onClick={() => iniciar.mutate()}
          disabled={iniciar.isPending}
        >
          {iniciar.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner /> Iniciando...
            </span>
          ) : (
            'Iniciar torneo'
          )}
        </button>
      )}
    </div>
  )
}
