import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { problemasQueryOptions } from '#/server/queries/problemas'

export const Route = createFileRoute('/admin/problemas/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(problemasQueryOptions()),
  component: AdminProblemsList,
})

const ETIQUETAS_GRUPO: Record<string, string> = {
  invitado_junior: 'Invitados + Junior',
  senior: 'Senior',
}

const ETIQUETAS_CATEGORIA: Record<string, string> = {
  debugging: 'Debugging',
  normal: 'Normal',
}

function AdminProblemsList() {
  const { data: problemas } = useSuspenseQuery(problemasQueryOptions())
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Problemas</h1>
      <Link to="/admin/problemas/$problemaId" params={{ problemaId: 'new' }} className="text-blue-600">
        + Nuevo problema
      </Link>
      <table className="mt-4 w-full border-collapse text-left">
        <thead>
          <tr className="border-b">
            <th className="p-2">Título</th>
            <th className="p-2">Descripción</th>
            <th className="p-2">Dificultad</th>
            <th className="p-2">Puntos</th>
            <th className="p-2">Grupo</th>
            <th className="p-2">Categoría</th>
          </tr>
        </thead>
        <tbody>
          {problemas.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="p-2">
                <Link to="/admin/problemas/$problemaId" params={{ problemaId: p.id }} className="text-blue-600">
                  {p.titulo}
                </Link>
              </td>
              <td className="max-w-md truncate p-2">{p.descripcion}</td>
              <td className="p-2">{p.dificultad}</td>
              <td className="p-2">{p.puntos}</td>
              <td className="p-2">{ETIQUETAS_GRUPO[p.grupo] ?? p.grupo}</td>
              <td className="p-2">{ETIQUETAS_CATEGORIA[p.categoriaProblema] ?? p.categoriaProblema}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
