import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { participantesConProgresoQueryOptions } from '#/server/queries/respuestas'
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

export const Route = createFileRoute('/admin/respuestas/')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(participantesConProgresoQueryOptions()),
  component: AdminRespuestasPage,
})

const ETIQUETAS_CATEGORIA: Record<string, string> = {
  invitado: 'Invitado',
  junior: 'Junior',
  senior: 'Senior',
}

function AdminRespuestasPage() {
  const { data } = useSuspenseQuery(participantesConProgresoQueryOptions())

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-8">
      <h1 className={`text-2xl ${ADMIN_TITLE}`}>Respuestas</h1>
      {(['invitado', 'junior', 'senior'] as const).map((categoria) => {
        const filas = data.filter((f) => f.categoria === categoria)
        if (filas.length === 0) return null
        return (
          <div key={categoria} className="mt-6">
            <h2 className={`text-lg ${ADMIN_TITLE}`}>
              {ETIQUETAS_CATEGORIA[categoria]}
            </h2>
            <div className={`${ADMIN_CARD} mt-2 overflow-x-auto`}>
              <table className={CLASE_TABLA}>
                <thead>
                  <tr className={CLASE_ENCABEZADO_ADMIN}>
                    <th className="p-3">Puesto</th>
                    <th className="p-3">Nombre</th>
                    <th className="p-3">Completados</th>
                    <th className="p-3">Pendientes</th>
                    <th className="p-3">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.usuarioId} className={CLASE_FILA_ADMIN}>
                      <td className="p-3 text-admin-ink-soft">{f.puesto}</td>
                      <td className="p-3">
                        <Link
                          to="/admin/respuestas/$usuarioId"
                          params={{ usuarioId: f.usuarioId }}
                          className={ADMIN_LINK}
                        >
                          {f.nombre}
                        </Link>
                      </td>
                      <td className="p-3 text-admin-ink-soft">
                        {f.cantidadCompletados}
                      </td>
                      <td className="p-3 text-admin-ink-soft">
                        {f.cantidadPendientes}
                      </td>
                      <td className="p-3 font-mono font-bold text-admin-gold">
                        {f.puntosTotales}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
