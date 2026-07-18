import { useState } from 'react'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ejecutarCodigo } from '#/server/functions/run'
import {
  problemaQueryOptions,
  problemasQueryOptions,
} from '#/server/queries/problemas'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'
import { miProgresoQueryOptions } from '#/server/queries/progreso'
import { IconoLista } from '#/components/IconoLista'
import { ProblemDescription } from '#/components/ProblemDescription'
import { CodeEditor } from '#/components/CodeEditor'
import { RunResults } from '#/components/RunResults'
import { AssistantModal } from '#/components/AssistantModal'
import { ProblemSolvedModal } from '#/components/ProblemSolvedModal'
import { Spinner } from '#/components/Spinner'
import { serializarCanonico } from '#/server/judge/serializar'
import type { LenguajeProgramacion } from '#/server/envios/validar'

export const Route = createFileRoute('/_app/problemas/$problemaId')({
  loader: async ({ context, params }) => {
    const [datosProblema] = await Promise.all([
      context.queryClient.ensureQueryData(
        problemaQueryOptions(params.problemaId),
      ),
      context.queryClient.ensureQueryData(usuarioActualOpcionalQueryOptions()),
      context.queryClient.ensureQueryData(problemasQueryOptions()),
      context.queryClient.ensureQueryData(miProgresoQueryOptions()),
    ])
    // Un problema ya resuelto no se puede volver a ver ni editar: se
    // redirige a la lista en vez de mostrar el editor bloqueado.
    if (datosProblema.resuelto) throw redirect({ to: '/problemas' })
  },
  component: ProblemDetailPage,
})

function ProblemDetailPage() {
  const { problemaId } = Route.useParams()
  // key={problemaId} fuerza un remount completo al navegar entre problemas:
  // sin esto, TanStack Router reutiliza la misma instancia del componente
  // (solo cambia el param de la misma ruta), y el useState de `codigo`/
  // `lenguaje` de abajo nunca se vuelve a inicializar con los datos del
  // nuevo problema.
  return <ProblemDetailContent key={problemaId} problemaId={problemaId} />
}

function ProblemDetailContent({ problemaId }: { problemaId: string }) {
  const navigate = useNavigate()
  const { data: datosProblema } = useSuspenseQuery(
    problemaQueryOptions(problemaId),
  )
  const { data: user } = useSuspenseQuery(usuarioActualOpcionalQueryOptions())
  const { data: listaProblemas } = useSuspenseQuery(problemasQueryOptions())
  const { data: progreso } = useSuspenseQuery(miProgresoQueryOptions())
  const { problema, casosPrueba, lenguajes, resuelto } = datosProblema
  const resueltosIds = new Set(
    progreso.problemas
      .filter((p) => p.estadoProgreso !== 'pendiente')
      .map((p) => p.problemaId),
  )
  const indice = listaProblemas.findIndex((p) => p.id === problemaId)
  // Los problemas ya resueltos no se pueden volver a abrir (ver loader),
  // así que la navegación anterior/siguiente los salta en vez de llevar a
  // un problema al que el participante no puede entrar.
  let anterior: (typeof listaProblemas)[number] | null = null
  for (let i = indice - 1; i >= 0; i--) {
    if (!resueltosIds.has(listaProblemas[i].id)) {
      anterior = listaProblemas[i]
      break
    }
  }
  let siguiente: (typeof listaProblemas)[number] | null = null
  for (let i = indice + 1; i < listaProblemas.length; i++) {
    if (!resueltosIds.has(listaProblemas[i].id)) {
      siguiente = listaProblemas[i]
      break
    }
  }
  const [lenguaje, setLenguaje] = useState<LenguajeProgramacion>(
    lenguajes[0]?.lenguaje ?? 'python',
  )
  const [codigo, setCodigo] = useState(lenguajes[0]?.codigoInicial ?? '')
  const [mostrarAsistente, setMostrarAsistente] = useState(false)

  const ejecutar = useMutation({
    mutationFn: () =>
      ejecutarCodigo({ data: { problemaId, lenguaje, codigo } }),
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : String(err)),
  })

  if (!problema) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold">Problema no encontrado</h1>
        <p className="text-red-600">
          No existe un problema con el id "{problemaId}".
        </p>
      </div>
    )
  }

  const ejemplos = casosPrueba
    .filter((c) => c.visible)
    .map((c) => ({
      argumentos: c.argumentos,
      salidaEsperadaTexto: serializarCanonico(
        c.salidaEsperada,
        problema.tipoRetorno,
      ),
    }))

  function handleLenguajeChange(nuevoLenguaje: LenguajeProgramacion) {
    setLenguaje(nuevoLenguaje)
    const config = lenguajes.find((l) => l.lenguaje === nuevoLenguaje)
    setCodigo(config?.codigoInicial ?? '')
  }

  function handleAceptarResuelto() {
    if (siguiente) {
      navigate({
        to: '/problemas/$problemaId',
        params: { problemaId: siguiente.id },
      })
    } else {
      navigate({ to: '/problemas' })
    }
  }

  const errorEjecucion = ejecutar.data?.error ?? null
  const resultadosEjecucion = !errorEjecucion
    ? (ejecutar.data?.resultados ?? null)
    : null
  const hint = ejecutar.data?.hint ?? null

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        {anterior ? (
          <Link
            to="/problemas/$problemaId"
            params={{ problemaId: anterior.id }}
            className="rounded px-3 py-1 text-xl text-gray-600 hover:bg-gray-100 hover:text-blue-600"
            aria-label="Problema anterior"
            title={anterior.titulo}
          >
            ←
          </Link>
        ) : (
          <span className="w-8" />
        )}
        <Link
          to="/problemas"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600"
          aria-label="Ver lista de problemas"
          title="Ver lista de problemas"
        >
          <IconoLista className="h-4 w-4" />
          {indice >= 0
            ? `Problema ${indice + 1} de ${listaProblemas.length}`
            : 'Ver lista de problemas'}
        </Link>
        {siguiente ? (
          <Link
            to="/problemas/$problemaId"
            params={{ problemaId: siguiente.id }}
            className="rounded px-3 py-1 text-xl text-gray-600 hover:bg-gray-100 hover:text-blue-600"
            aria-label="Siguiente problema"
            title={siguiente.titulo}
          >
            →
          </Link>
        ) : (
          <span className="w-8" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ProblemDescription
          titulo={problema.titulo}
          descripcion={problema.descripcion}
          dificultad={problema.dificultad}
          categoriaProblema={problema.categoriaProblema}
          ejemplos={ejemplos}
          resuelto={resuelto}
        />
        <div>
          <select
            className="border p-2"
            value={lenguaje}
            onChange={(e) =>
              handleLenguajeChange(e.target.value as LenguajeProgramacion)
            }
          >
            {lenguajes.map((l) => (
              <option key={l.lenguaje} value={l.lenguaje}>
                {l.lenguaje}
              </option>
            ))}
          </select>
          <CodeEditor lenguaje={lenguaje} value={codigo} onChange={setCodigo} />
          <button
            className="mt-2 rounded bg-gray-700 px-4 py-2 text-white disabled:bg-gray-300"
            onClick={() => ejecutar.mutate()}
            disabled={ejecutar.isPending}
          >
            {ejecutar.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> Ejecutando...
              </span>
            ) : (
              'Run'
            )}
          </button>
          {errorEjecucion && (
            <p className="mt-4 text-red-600">{errorEjecucion}</p>
          )}
          {!errorEjecucion && resultadosEjecucion && (
            <RunResults results={resultadosEjecucion} hint={hint} />
          )}
          {user && user.categoria === 'invitado' && (
            <button
              className="mt-2 ml-2 rounded bg-purple-600 px-4 py-2 text-white"
              onClick={() => setMostrarAsistente(true)}
            >
              Preguntar a Haiku
            </button>
          )}
          {mostrarAsistente && user && (
            <AssistantModal
              problemaId={problemaId}
              preguntasUsadas={user.preguntasIaUsadas}
              onClose={() => setMostrarAsistente(false)}
            />
          )}
        </div>
      </div>
      {ejecutar.data?.resuelto && (
        <ProblemSolvedModal
          duracionMinutos={ejecutar.data.resuelto.duracionMinutos}
          puntos={ejecutar.data.resuelto.puntos}
          onAceptar={handleAceptarResuelto}
        />
      )}
    </div>
  )
}
