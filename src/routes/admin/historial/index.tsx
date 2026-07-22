import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  estadoTorneoQueryOptions,
  torneosQueryOptions,
} from '#/server/queries/torneo'
import {
  CLASE_TABLA,
  CLASE_FILA_ADMIN,
  CLASE_ENCABEZADO_ADMIN,
} from '#/components/tableStyles'
import {
  ADMIN_CARD,
  ADMIN_TITLE,
  ADMIN_LINK,
} from '#/components/adminBrandStyles'

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
    <div className="mx-auto max-w-[900px] px-8 py-8">
      <h1 className={`text-2xl ${ADMIN_TITLE}`}>Historial de torneos</h1>
      {pasados.length === 0 ? (
        <p className="mt-4 text-admin-ink-soft">
          Todavía no hay torneos anteriores.
        </p>
      ) : (
        <div className={`${ADMIN_CARD} mt-4 overflow-x-auto`}>
          <table className={CLASE_TABLA}>
            <thead>
              <tr className={CLASE_ENCABEZADO_ADMIN}>
                <th className="p-3">Año</th>
                <th className="p-3">Iniciado</th>
                <th className="p-3">Concluido</th>
              </tr>
            </thead>
            <tbody>
              {pasados.map((t) => (
                <tr key={t.id} className={CLASE_FILA_ADMIN}>
                  <td className="p-3">
                    <Link
                      to="/admin/historial/$torneoId"
                      params={{ torneoId: t.id }}
                      className={ADMIN_LINK}
                    >
                      {t.anio}
                    </Link>
                  </td>
                  <td className="p-3 text-admin-ink-soft">
                    {t.iniciadoEn
                      ? new Date(t.iniciadoEn).toLocaleString()
                      : '—'}
                  </td>
                  <td className="p-3 text-admin-ink-soft">
                    {t.finalizadoEn
                      ? new Date(t.finalizadoEn).toLocaleString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
