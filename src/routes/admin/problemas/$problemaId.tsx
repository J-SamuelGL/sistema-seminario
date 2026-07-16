import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { obtenerProblema, crearProblema, actualizarProblema, eliminarProblema } from '#/server/functions/problems'
import { AdminProblemForm } from '#/components/AdminProblemForm'
import type { ValorFormularioProblema, DatosProblemaEnviado, TipoDatoFormulario } from '#/components/AdminProblemForm'

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
          orden: data.problema.orden,
          grupo: data.problema.grupo,
          puntos: data.problema.puntos,
          parametros: data.problema.parametros as ValorFormularioProblema['parametros'],
          tipoRetorno: data.problema.tipoRetorno as TipoDatoFormulario,
          lenguajes: data.lenguajes.map((l) => ({
            lenguaje: l.lenguaje,
            nombreFuncion: l.nombreFuncion,
            codigoInicial: l.codigoInicial,
          })),
          casosPrueba: data.casosPrueba.map((cp) => ({
            argumentosTexto: (cp.argumentos as unknown[]).map((a) => JSON.stringify(a)),
            salidaEsperadaTexto: JSON.stringify(cp.salidaEsperada),
            visible: cp.visible,
          })),
        }
      : {
          titulo: '',
          descripcion: '',
          dificultad: 'easy',
          orden: 0,
          grupo: 'invitado_junior',
          puntos: 10,
          parametros: [],
          tipoRetorno: 'int',
          lenguajes: [],
          casosPrueba: [],
        }

  async function handleSubmit(value: DatosProblemaEnviado) {
    if (problemaId === 'new') {
      await crearProblema({ data: value as Parameters<typeof crearProblema>[0]['data'] })
    } else {
      await actualizarProblema({
        data: { ...value, id: problemaId } as Parameters<typeof actualizarProblema>[0]['data'],
      })
    }
    await navigate({ to: '/admin/problemas' })
  }

  async function handleDelete() {
    if (
      !window.confirm(
        '¿Eliminar este problema? Se borran también sus casos de prueba y su configuración de lenguajes.',
      )
    )
      return
    await eliminarProblema({ data: problemaId })
    await navigate({ to: '/admin/problemas' })
  }

  return (
    <div>
      {problemaId !== 'new' && (
        <button className="m-4 rounded bg-red-600 px-4 py-2 text-white" onClick={handleDelete}>
          Eliminar problema
        </button>
      )}
      <AdminProblemForm initial={initial} onSubmit={handleSubmit} />
    </div>
  )
}
