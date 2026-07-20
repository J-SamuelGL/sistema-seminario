import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  estadoTorneoQueryOptions,
  torneosQueryOptions,
} from '#/server/queries/torneo'
import { CLASE_TABLA, CLASE_FILA } from '#/components/tableStyles'

export const Route = createFileRoute('/admin/historial/')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(torneosQueryOptions()),
      context.queryClient.ensureQueryData(estadoTorneoQueryOptions()),
    ])
  },
  component: HistorialIndexPage,
})

function HistorialIndexPage() {
  const { data: torneos } = useSuspenseQuery(torneosQueryOptions())
  const { data: torneoActual } = useSuspenseQuery(estadoTorneoQueryOptions())
  const pasados = torneos.filter((t) => t.id !== torneoActual?.id)

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Historial de torneos</h1>
      {pasados.length === 0 ? (
        <p className="mt-4">Todavía no hay torneos anteriores.</p>
      ) : (
        <table className={`mt-4 ${CLASE_TABLA}`}>
          <thead>
            <tr className={CLASE_FILA}>
              <th className="p-2">Año</th>
              <th className="p-2">Iniciado</th>
              <th className="p-2">Concluido</th>
            </tr>
          </thead>
          <tbody>
            {pasados.map((t) => (
              <tr key={t.id} className={CLASE_FILA}>
                <td className="p-2">
                  <Link
                    to="/admin/historial/$torneoId"
                    params={{ torneoId: t.id }}
                    className="text-blue-600 underline"
                  >
                    {t.anio}
                  </Link>
                </td>
                <td className="p-2">
                  {t.iniciadoEn ? new Date(t.iniciadoEn).toLocaleString() : '—'}
                </td>
                <td className="p-2">
                  {t.finalizadoEn
                    ? new Date(t.finalizadoEn).toLocaleString()
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
