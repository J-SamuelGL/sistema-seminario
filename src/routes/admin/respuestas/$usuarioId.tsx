import { Fragment, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { actualizarEstadoProgreso } from '#/server/functions/admin-respuestas'
import {
  participantesConProgresoQueryOptions,
  progresoParticipanteQueryOptions,
} from '#/server/queries/respuestas'
import { Spinner } from '#/components/Spinner'

export const Route = createFileRoute('/admin/respuestas/$usuarioId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      progresoParticipanteQueryOptions(params.usuarioId),
    ),
  component: AdminRespuestaDetallePage,
})

const ETIQUETAS_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  completado: 'Completado',
  aprobado_manual: 'Aprobado manual',
}

function AdminRespuestaDetallePage() {
  const { usuarioId } = Route.useParams()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(progresoParticipanteQueryOptions(usuarioId))
  const [expandido, setExpandido] = useState<string | null>(null)

  const cambiarEstado = useMutation({
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
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : String(err)),
  })

  return (
    <div className="flex flex-col gap-4 p-8">
      <h1 className="text-xl font-bold">
        {data.participante.nombre} — {data.puntosTotales} pts — Puesto #
        {data.puesto ?? '—'}
      </h1>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b">
            <th className="p-2">Problema</th>
            <th className="p-2">Dificultad</th>
            <th className="p-2">Categoría</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Duración</th>
            <th className="p-2">Enviado en</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.problemas.map((p) => (
            <Fragment key={p.problemaId}>
              <tr className="border-b">
                <td className="p-2">
                  {p.codigo && (
                    <button
                      className="mr-2 text-blue-600 underline"
                      onClick={() =>
                        setExpandido(
                          expandido === p.problemaId ? null : p.problemaId,
                        )
                      }
                    >
                      {expandido === p.problemaId ? '▾' : '▸'}
                    </button>
                  )}
                  {p.titulo}
                </td>
                <td className="p-2">{p.dificultad}</td>
                <td className="p-2">{p.categoriaProblema}</td>
                <td className="p-2">{ETIQUETAS_ESTADO[p.estadoProgreso]}</td>
                <td className="p-2">
                  {p.duracionMinutos !== null
                    ? `${p.duracionMinutos} min`
                    : '—'}
                </td>
                <td className="p-2">
                  {p.creadoEn ? new Date(p.creadoEn).toLocaleString() : '—'}
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <select
                      className="border p-1 text-sm"
                      value={p.estadoProgreso}
                      disabled={cambiarEstado.isPending}
                      onChange={(e) =>
                        cambiarEstado.mutate({
                          problemaId: p.problemaId,
                          estadoProgreso: e.target.value as
                            'pendiente' | 'completado' | 'aprobado_manual',
                        })
                      }
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="completado">Completado</option>
                      <option value="aprobado_manual">Aprobado manual</option>
                    </select>
                    {cambiarEstado.isPending && <Spinner />}
                  </div>
                </td>
              </tr>
              {expandido === p.problemaId && p.codigo && (
                <tr className="border-b bg-gray-50">
                  <td colSpan={7} className="p-2">
                    <p className="text-sm text-gray-600">
                      Lenguaje: {p.lenguaje}
                    </p>
                    <pre className="mt-1 whitespace-pre-wrap rounded bg-white p-2 text-sm">
                      {p.codigo}
                    </pre>
                    {p.resultados && (
                      <ul className="mt-2 flex flex-col gap-1 text-sm">
                        {p.resultados.map((r, i) => (
                          <li key={i}>
                            <code>
                              {r.argumentos
                                .map((a) => JSON.stringify(a))
                                .join(', ')}
                            </code>{' '}
                            — Esperado: <code>{r.salidaEsperada}</code> —
                            Obtenido:{' '}
                            <code>{r.salidaObtenida || r.salidaError}</code> —{' '}
                            {r.aprobado ? '✅' : '❌'}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
