import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { QrScanner } from '#/components/QrScanner'
import { registrarIngresoPorToken } from '#/server/functions/checkin'
import { participantesQueryOptions } from '#/server/queries/participantes'
import { Spinner } from '#/components/Spinner'
import { useToastMutation } from '#/components/useToastMutation'
import { ADMIN_TITLE } from '#/components/adminBrandStyles'

export const Route = createFileRoute('/admin/ingreso')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(participantesQueryOptions()),
  component: CheckinPage,
})

function CheckinPage() {
  const queryClient = useQueryClient()
  const { data: participantes } = useSuspenseQuery(participantesQueryOptions())

  const escanear = useToastMutation({
    mutationFn: (token: string) => registrarIngresoPorToken({ data: token }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: participantesQueryOptions().queryKey,
      })
    },
  })

  const yaIngresados = participantes.filter((p) => p.ingresadoEn).length
  const ultimoResultado = escanear.data ?? null

  return (
    <div className="flex flex-col items-center gap-4 px-8 py-10 text-center">
      <h1 className={`text-2xl ${ADMIN_TITLE}`}>Check-in</h1>
      <p className="text-sm text-admin-ink-soft">
        {yaIngresados} de {participantes.length} participantes ya hicieron
        check-in
      </p>
      <div className="rounded-md border border-admin-line bg-admin-paper-soft p-4">
        <QrScanner onScan={(token) => escanear.mutate(token)} />
      </div>
      {escanear.isPending && (
        <p className="flex items-center gap-2 text-admin-ink-soft">
          <Spinner /> Procesando...
        </p>
      )}
      {ultimoResultado?.status === 'ingresado' && (
        <p className="text-admin-navy-strong">
          ✅ {ultimoResultado.nombreUsuario} presente
        </p>
      )}
      {ultimoResultado?.status === 'ya_ingresado' && (
        <p className="text-admin-gold">
          ⚠️ {ultimoResultado.nombreUsuario} ya había hecho check-in
        </p>
      )}
      {ultimoResultado?.status === 'no_encontrado' && (
        <p className="text-admin-red">❌ Código no reconocido</p>
      )}
    </div>
  )
}
