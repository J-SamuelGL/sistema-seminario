import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { obtenerProblema, crearProblema, actualizarProblema } from '#/server/functions/problems'
import { AdminProblemForm } from '#/components/AdminProblemForm'
import type { ValorFormularioProblema } from '#/components/AdminProblemForm'

export const Route = createFileRoute('/admin/problemas/$problemaId')({
  loader: async ({ params }) => {
    if (params.problemaId === 'new') return null
    return obtenerProblema({ data: params.problemaId })
  },
  component: AdminProblemEditPage,
})

function AdminProblemEditPage() {
  const { problemaId } = Route.useParams()
  const data = Route.useLoaderData()
  const navigate = useNavigate()

  if (problemaId !== 'new' && !data?.problema) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold">Problema no encontrado</h1>
        <p className="text-red-600">No existe un problema con el id "{problemaId}".</p>
      </div>
    )
  }

  const initial: ValorFormularioProblema =
    data && data.problema
      ? {
          titulo: data.problema.titulo,
          descripcion: data.problema.descripcion,
          dificultad: data.problema.dificultad,
          lenguajesPermitidos: data.problema.lenguajesPermitidos,
          orden: data.problema.orden,
          grupo: data.problema.grupo,
          casosPrueba: data.casosPrueba.map((cp) => ({ entrada: cp.entrada, salidaEsperada: cp.salidaEsperada })),
        }
      : {
          titulo: '',
          descripcion: '',
          dificultad: 'easy',
          lenguajesPermitidos: [],
          orden: 0,
          grupo: 'invitado_junior',
          casosPrueba: [],
        }

  async function handleSubmit(value: ValorFormularioProblema) {
    if (problemaId === 'new') {
      await crearProblema({ data: value })
    } else {
      await actualizarProblema({ data: { ...value, id: problemaId } })
    }
    await navigate({ to: '/admin/problemas' })
  }

  return <AdminProblemForm initial={initial} onSubmit={handleSubmit} />
}
