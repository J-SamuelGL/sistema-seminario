import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { listAllSubmissions } from '#/server/functions/admin-submissions'

export const Route = createFileRoute('/admin/submissions')({
  loader: () => listAllSubmissions(),
  component: AdminSubmissionsPage,
})

function AdminSubmissionsPage() {
  const initial = Route.useLoaderData()
  const [rows, setRows] = useState(initial)

  useEffect(() => {
    const interval = setInterval(() => {
      listAllSubmissions()
        .then(setRows)
        .catch(() => {
          // Ignore transient polling errors; the next interval tick will retry.
        })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Submissions en vivo</h1>
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
              <td className="border p-2">{new Date(row.createdAt).toLocaleTimeString()}</td>
              <td className="border p-2">{row.userName}</td>
              <td className="border p-2">{row.problemTitle}</td>
              <td className="border p-2">{row.language}</td>
              <td className="border p-2">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
