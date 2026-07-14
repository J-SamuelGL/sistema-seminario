import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { listarTodosLosEnvios } from '#/server/functions/admin-submissions'

export const Route = createFileRoute('/admin/envios')({
  loader: () => listarTodosLosEnvios(),
  component: AdminSubmissionsPage,
})

function AdminSubmissionsPage() {
  const initial = Route.useLoaderData()
  const [rows, setRows] = useState(initial)

  useEffect(() => {
    const interval = setInterval(() => {
      listarTodosLosEnvios()
        .then(setRows)
        .catch(() => {
          // Ignore transient polling errors; the next interval tick will retry.
        })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

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
              <td className="border p-2">{row.nombreUsuario}</td>
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
