import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { QrScanner } from '#/components/QrScanner'
import { registrarIngresoPorToken } from '#/server/functions/checkin'
import { participantesQueryOptions } from '#/server/queries/participantes'
import { Spinner } from '#/components/Spinner'

export const Route = createFileRoute('/admin/ingreso')({
  loader: ({ context }) => context.queryClient.ensureQueryData(participantesQueryOptions()),
  component: CheckinPage,
})

function CheckinPage() {
  const queryClient = useQueryClient()
  const { data: participantes } = useSuspenseQuery(participantesQueryOptions())

  const escanear = useMutation({
    mutationFn: (token: string) => registrarIngresoPorToken({ data: token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: participantesQueryOptions().queryKey })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  })

  const yaIngresados = participantes.filter((p) => p.ingresadoEn).length
  const ultimoResultado = escanear.data ?? null

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h1 className="text-xl font-bold">Check-in</h1>
      <p className="text-sm text-gray-600">
        {yaIngresados} de {participantes.length} participantes ya hicieron check-in
      </p>
      <QrScanner onScan={(token) => escanear.mutate(token)} />
      {escanear.isPending && (
        <p className="flex items-center gap-2 text-gray-500">
          <Spinner /> Procesando...
        </p>
      )}
      {ultimoResultado?.status === 'ingresado' && (
        <p className="text-green-600">✅ {ultimoResultado.nombreUsuario} presente</p>
      )}
      {ultimoResultado?.status === 'ya_ingresado' && (
        <p className="text-yellow-600">
          ⚠️ {ultimoResultado.nombreUsuario} ya había hecho check-in
        </p>
      )}
      {ultimoResultado?.status === 'no_encontrado' && (
        <p className="text-red-600">❌ Código no reconocido</p>
      )}
    </div>
  )
}
