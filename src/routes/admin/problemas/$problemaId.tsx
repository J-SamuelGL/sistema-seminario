import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  crearProblema,
  actualizarProblema,
  eliminarProblema,
} from '#/server/functions/problems'
import {
  problemaQueryOptions,
  problemasQueryOptions,
} from '#/server/queries/problemas'
import { AdminProblemForm } from '#/components/AdminProblemForm'
import { LoadingButton } from '#/components/LoadingButton'
import { useToastMutation } from '#/components/useToastMutation'
import type {
  ValorFormularioProblema,
  DatosProblemaEnviado,
} from '#/components/AdminProblemForm'

export const Route = createFileRoute('/admin/problemas/$problemaId')({
  loader: ({ context, params }) => {
    if (params.problemaId === 'new') return
    return context.queryClient.ensureQueryData(
      problemaQueryOptions(params.problemaId),
    )
  },
  component: AdminProblemEditPage,
})

function AdminProblemEditPage() {
  const { problemaId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // useQuery + enabled (no useSuspenseQuery + loader) a propósito: el loader
  // no puede pedir datos para el caso 'new' (no hay problema que cargar), así
  // que esta es la única ruta donde el fetch se salta condicionalmente.
  const { data } = useQuery({
    ...problemaQueryOptions(problemaId),
    enabled: problemaId !== 'new',
  })

  const invalidarProblemas = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: problemasQueryOptions().queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: problemaQueryOptions(problemaId).queryKey,
      }),
    ])

  const crear = useToastMutation({
    mutationFn: (value: DatosProblemaEnviado) => crearProblema({ data: value }),
    onSuccess: async () => {
      await invalidarProblemas()
      await navigate({ to: '/admin/problemas' })
      toast.success('Problema creado.')
    },
  })

  const actualizar = useToastMutation({
    mutationFn: (value: DatosProblemaEnviado & { id: string }) =>
      actualizarProblema({ data: value }),
    onSuccess: async () => {
      await invalidarProblemas()
      await navigate({ to: '/admin/problemas' })
      toast.success('Problema actualizado.')
    },
  })

  const eliminar = useToastMutation({
    mutationFn: () => eliminarProblema({ data: problemaId }),
    onSuccess: async () => {
      await invalidarProblemas()
      await navigate({ to: '/admin/problemas' })
      toast.success('Problema eliminado.')
    },
  })

  if (problemaId !== 'new' && !data?.problema) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold">Problema no encontrado</h1>
        <p className="text-red-600">
          No existe un problema con el id "{problemaId}".
        </p>
      </div>
    )
  }

  const initial: ValorFormularioProblema =
    data && data.problema
      ? {
          titulo: data.problema.titulo,
          descripcion: data.problema.descripcion,
          dificultad: data.problema.dificultad,
          categoriaProblema: data.problema.categoriaProblema,
          orden: data.problema.orden,
          grupo: data.problema.grupo,
          puntos: data.problema.puntos,
          parametros: data.problema.parametros,
          tipoRetorno: data.problema.tipoRetorno,
          lenguajes: data.lenguajes.map((l) => ({
            lenguaje: l.lenguaje,
            nombreFuncion: l.nombreFuncion,
            codigoInicial: l.codigoInicial,
          })),
          casosPrueba: data.casosPrueba.map((cp) => ({
            argumentosTexto: (cp.argumentos as unknown[]).map((a) =>
              JSON.stringify(a),
            ),
            salidaEsperadaTexto: JSON.stringify(cp.salidaEsperada),
            visible: cp.visible,
          })),
        }
      : {
          titulo: '',
          descripcion: '',
          dificultad: 'Fácil',
          categoriaProblema: 'normal',
          orden: 0,
          grupo: 'invitado_junior',
          puntos: 10,
          parametros: [],
          tipoRetorno: 'int',
          lenguajes: [],
          casosPrueba: [],
        }

  function handleSubmit(value: DatosProblemaEnviado) {
    if (problemaId === 'new') {
      crear.mutate(value)
    } else {
      actualizar.mutate({ ...value, id: problemaId })
    }
  }

  function handleDelete() {
    if (
      !window.confirm(
        '¿Eliminar este problema? Se borran también sus casos de prueba y su configuración de lenguajes.',
      )
    )
      return
    eliminar.mutate()
  }

  return (
    <div>
      {problemaId !== 'new' && (
        <LoadingButton
          className="m-4 rounded bg-red-600 px-4 py-2 text-white disabled:bg-gray-300"
          onClick={handleDelete}
          isPending={eliminar.isPending}
          label="Eliminar problema"
          pendingLabel="Eliminando..."
        />
      )}
      <AdminProblemForm
        initial={initial}
        onSubmit={handleSubmit}
        isPending={crear.isPending || actualizar.isPending}
      />
    </div>
  )
}
