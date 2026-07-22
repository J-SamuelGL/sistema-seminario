import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { problemasQueryOptions } from '#/server/queries/problemas'
import { ETIQUETAS_CATEGORIA } from '#/components/labels'
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

export const Route = createFileRoute('/admin/problemas/')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(problemasQueryOptions()),
  component: AdminProblemsList,
})

const ETIQUETAS_GRUPO: Record<string, string> = {
  invitado_junior: 'Invitados + Junior',
  senior: 'Senior',
}

function AdminProblemsList() {
  const { data: problemas } = useSuspenseQuery(problemasQueryOptions())
  return (
    <div className="mx-auto max-w-[1200px] px-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl ${ADMIN_TITLE}`}>Problemas</h1>
        <Link
          to="/admin/problemas/$problemaId"
          params={{ problemaId: 'new' }}
          className={ADMIN_LINK}
        >
          + Nuevo problema
        </Link>
      </div>
      <div className={`${ADMIN_CARD} mt-4 overflow-x-auto`}>
        <table className={CLASE_TABLA}>
          <thead>
            <tr className={CLASE_ENCABEZADO_ADMIN}>
              <th className="p-3">Título</th>
              <th className="p-3">Descripción</th>
              <th className="p-3">Dificultad</th>
              <th className="p-3">Puntos</th>
              <th className="p-3">Grupo</th>
              <th className="p-3">Categoría</th>
            </tr>
          </thead>
          <tbody>
            {problemas.map((p) => (
              <tr key={p.id} className={CLASE_FILA_ADMIN}>
                <td className="p-3">
                  <Link
                    to="/admin/problemas/$problemaId"
                    params={{ problemaId: p.id }}
                    className={ADMIN_LINK}
                  >
                    {p.titulo}
                  </Link>
                </td>
                <td className="max-w-md truncate p-3 text-admin-ink-soft">
                  {p.descripcion}
                </td>
                <td className="p-3 text-admin-ink-soft">{p.dificultad}</td>
                <td className="p-3 font-mono text-admin-ink-soft">
                  {p.puntos}
                </td>
                <td className="p-3 text-admin-ink-soft">
                  {ETIQUETAS_GRUPO[p.grupo] ?? p.grupo}
                </td>
                <td className="p-3 text-admin-ink-soft">
                  {ETIQUETAS_CATEGORIA[p.categoriaProblema] ??
                    p.categoriaProblema}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
