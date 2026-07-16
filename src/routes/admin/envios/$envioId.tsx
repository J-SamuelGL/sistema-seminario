import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { obtenerDetalleEnvio, aprobarEnvioManualmente, revertirAprobacion } from '#/server/functions/admin-submissions'
import { enviosQueryOptions } from '#/server/queries/envios'

function detalleEnvioQueryOptions(envioId: string) {
  return queryOptions({
    queryKey: ['envios', envioId],
    queryFn: () => obtenerDetalleEnvio({ data: envioId }),
  })
}

export const Route = createFileRoute('/admin/envios/$envioId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(detalleEnvioQueryOptions(params.envioId)),
  component: AdminEnvioDetailPage,
})

function AdminEnvioDetailPage() {
  const { envioId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: envio } = useSuspenseQuery(detalleEnvioQueryOptions(envioId))

  const invalidarTodo = () => queryClient.invalidateQueries({ queryKey: enviosQueryOptions().queryKey })

  const aprobar = useMutation({
    mutationFn: () => aprobarEnvioManualmente({ data: envioId }),
    onSuccess: invalidarTodo,
  })

  const revertir = useMutation({
    mutationFn: () => revertirAprobacion({ data: envioId }),
    onSuccess: invalidarTodo,
  })

  if (!envio) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold">Envío no encontrado</h1>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-8">
      <button className="text-blue-600 underline" onClick={() => navigate({ to: '/admin/envios' })}>
        ← Volver a envíos
      </button>
      <h1 className="text-xl font-bold">
        {envio.nombreUsuario} — {envio.tituloProblema}
      </h1>
      <p>Lenguaje: {envio.lenguaje}</p>
      <p>
        Estado actual: <strong>{envio.estado}</strong>
      </p>
      {envio.veredictoOriginal && (
        <p className="text-sm text-gray-600">
          Veredicto original del sistema: {envio.veredictoOriginal} — aprobado manualmente el{' '}
          {envio.aprobadoEn ? new Date(envio.aprobadoEn).toLocaleString() : ''}
        </p>
      )}

      <pre className="whitespace-pre-wrap rounded bg-gray-50 p-2 text-sm">{envio.codigo}</pre>

      <h2 className="font-bold">Resultados por caso</h2>
      <ul className="flex flex-col gap-2">
        {(envio.resultados ?? []).map((r, i) => (
          <li key={i} className="border p-2 text-sm">
            <code>{r.argumentos.map((a) => JSON.stringify(a)).join(', ')}</code> — Esperado:{' '}
            <code>{r.salidaEsperada}</code> — Obtenido: <code>{r.salidaObtenida || r.salidaError}</code> —{' '}
            {r.aprobado ? '✅' : '❌'}
          </li>
        ))}
      </ul>

      {envio.comentarioClaude && (
        <div>
          <h2 className="font-bold">Comentario de Claude</h2>
          <p>{envio.comentarioClaude}</p>
        </div>
      )}

      <div className="flex gap-2">
        {envio.estado !== 'aceptado' && (
          <button
            className="rounded bg-green-600 px-4 py-2 text-white disabled:bg-gray-300"
            disabled={aprobar.isPending}
            onClick={() => aprobar.mutate()}
          >
            Aprobar manualmente
          </button>
        )}
        {envio.veredictoOriginal && (
          <button
            className="rounded bg-gray-200 px-4 py-2 disabled:bg-gray-100"
            disabled={revertir.isPending}
            onClick={() => revertir.mutate()}
          >
            Revertir a veredicto original
          </button>
        )}
      </div>
    </div>
  )
}
