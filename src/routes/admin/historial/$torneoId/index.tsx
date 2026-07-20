import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { historialParticipantesQueryOptions } from '#/server/queries/historial'
import { CLASE_TABLA, CLASE_FILA } from '#/components/tableStyles'

export const Route = createFileRoute('/admin/historial/$torneoId/')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      historialParticipantesQueryOptions(params.torneoId),
    ),
  component: HistorialTorneoPage,
})

const ETIQUETAS_CATEGORIA: Record<string, string> = {
  invitado: 'Invitado',
  junior: 'Junior',
  senior: 'Senior',
}

function HistorialTorneoPage() {
  const { torneoId } = Route.useParams()
  const { data } = useSuspenseQuery(
    historialParticipantesQueryOptions(torneoId),
  )

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Resultados</h1>
      {(['invitado', 'junior', 'senior'] as const).map((categoria) => {
        const filas = data.filter((f) => f.categoria === categoria)
        if (filas.length === 0) return null
        return (
          <div key={categoria} className="mt-6">
            <h2 className="text-lg font-bold">
              {ETIQUETAS_CATEGORIA[categoria]}
            </h2>
            <table className={`mt-2 ${CLASE_TABLA}`}>
              <thead>
                <tr className={CLASE_FILA}>
                  <th className="p-2">Puesto</th>
                  <th className="p-2">Nombre</th>
                  <th className="p-2">Correo</th>
                  <th className="p-2">Completados</th>
                  <th className="p-2">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.usuarioId} className={CLASE_FILA}>
                    <td className="p-2">{f.puesto}</td>
                    <td className="p-2">
                      <Link
                        to="/admin/historial/$torneoId/$usuarioId"
                        params={{ torneoId, usuarioId: f.usuarioId }}
                        className="text-blue-600 underline"
                      >
                        {f.nombre}
                      </Link>
                    </td>
                    <td className="p-2">{f.correo}</td>
                    <td className="p-2">{f.cantidadCompletados}</td>
                    <td className="p-2">{f.puntosTotales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
