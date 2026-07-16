import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { enviosQueryOptions } from '#/server/queries/envios'

export const Route = createFileRoute('/admin/envios/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(enviosQueryOptions()),
  component: AdminSubmissionsPage,
})

function AdminSubmissionsPage() {
  const { data: rows } = useSuspenseQuery(enviosQueryOptions())

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Envíos en vivo</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2 text-left">Hora</th>
            <th className="border p-2 text-left">Participante</th>
            <th className="border p-2 text-left">Problema</th>
            <th className="border p-2 text-left">Lenguaje</th>
            <th className="border p-2 text-left">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="border p-2">{new Date(row.creadoEn).toLocaleTimeString()}</td>
              <td className="border p-2">
                <Link to="/admin/envios/$envioId" params={{ envioId: row.id }} className="text-blue-600 underline">
                  {row.nombreUsuario}
                </Link>
              </td>
              <td className="border p-2">{row.tituloProblema}</td>
              <td className="border p-2">{row.lenguaje}</td>
              <td className="border p-2">{row.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
