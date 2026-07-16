import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { participantesConProgresoQueryOptions } from '#/server/queries/respuestas'

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
    <div className="p-8">
      <h1 className="text-xl font-bold">Respuestas</h1>
      {(['invitado', 'junior', 'senior'] as const).map((categoria) => {
        const filas = data.filter((f) => f.categoria === categoria)
        if (filas.length === 0) return null
        return (
          <div key={categoria} className="mt-6">
            <h2 className="text-lg font-bold">
              {ETIQUETAS_CATEGORIA[categoria]}
            </h2>
            <table className="mt-2 w-full border-collapse text-left">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Puesto</th>
                  <th className="p-2">Nombre</th>
                  <th className="p-2">Completados</th>
                  <th className="p-2">Pendientes</th>
                  <th className="p-2">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.usuarioId} className="border-b">
                    <td className="p-2">{f.puesto}</td>
                    <td className="p-2">
                      <Link
                        to="/admin/respuestas/$usuarioId"
                        params={{ usuarioId: f.usuarioId }}
                        className="text-blue-600 underline"
                      >
                        {f.nombre}
                      </Link>
                    </td>
                    <td className="p-2">{f.cantidadCompletados}</td>
                    <td className="p-2">{f.cantidadPendientes}</td>
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
