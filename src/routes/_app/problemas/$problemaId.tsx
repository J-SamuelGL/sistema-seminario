import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ejecutarCodigo } from '#/server/functions/run'
import { enviarCodigo } from '#/server/functions/submit'
import { problemaQueryOptions } from '#/server/queries/problemas'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'
import { ProblemDescription } from '#/components/ProblemDescription'
import { CodeEditor } from '#/components/CodeEditor'
import { RunResults } from '#/components/RunResults'
import { SubmitResult } from '#/components/SubmitResult'
import { AssistantModal } from '#/components/AssistantModal'
import { Spinner } from '#/components/Spinner'
import { serializarCanonico } from '#/server/judge/serializar'
import type { LenguajeProgramacion } from '#/server/envios/validar'

export const Route = createFileRoute('/_app/problemas/$problemaId')({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(problemaQueryOptions(params.problemaId)),
      context.queryClient.ensureQueryData(usuarioActualOpcionalQueryOptions()),
    ]),
  component: ProblemDetailPage,
})

function ProblemDetailPage() {
  const { problemaId } = Route.useParams()
  const { data: datosProblema } = useSuspenseQuery(problemaQueryOptions(problemaId))
  const { data: user } = useSuspenseQuery(usuarioActualOpcionalQueryOptions())
  const { problema, casosPrueba, lenguajes } = datosProblema
  const [lenguaje, setLenguaje] = useState<LenguajeProgramacion>(lenguajes[0]?.lenguaje ?? 'python')
  const [codigo, setCodigo] = useState(lenguajes[0]?.codigoInicial ?? '')
  const [mostrarAsistente, setMostrarAsistente] = useState(false)

  const ejecutar = useMutation({
    mutationFn: () => ejecutarCodigo({ data: { problemaId, lenguaje, codigo } }),
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  })

  const enviar = useMutation({
    mutationFn: () => enviarCodigo({ data: { problemaId, lenguaje, codigo } }),
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  })

  if (!problema) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold">Problema no encontrado</h1>
        <p className="text-red-600">No existe un problema con el id "{problemaId}".</p>
      </div>
    )
  }

  const ejemplos = casosPrueba
    .filter((c) => c.visible)
    .map((c) => ({ argumentos: c.argumentos, salidaEsperadaTexto: serializarCanonico(c.salidaEsperada, problema.tipoRetorno) }))

  function handleLenguajeChange(nuevoLenguaje: LenguajeProgramacion) {
    setLenguaje(nuevoLenguaje)
    const config = lenguajes.find((l) => l.lenguaje === nuevoLenguaje)
    setCodigo(config?.codigoInicial ?? '')
  }

  const errorEjecucion = ejecutar.data?.error ?? null
  const resultadosEjecucion = !errorEjecucion ? (ejecutar.data?.resultados ?? null) : null
  const hint = ejecutar.data?.hint ?? null

  const errorEnvio =
    enviar.data && (enviar.data.error || !enviar.data.veredicto)
      ? (enviar.data.error ?? 'No se pudo evaluar el envío.')
      : null
  const resultadoEnvio =
    enviar.data && !errorEnvio && enviar.data.veredicto
      ? { envioId: enviar.data.envioId, veredicto: enviar.data.veredicto }
      : null

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <ProblemDescription titulo={problema.titulo} descripcion={problema.descripcion} dificultad={problema.dificultad} ejemplos={ejemplos} />
      <div>
        <select
          className="border p-2"
          value={lenguaje}
          onChange={(e) => handleLenguajeChange(e.target.value as LenguajeProgramacion)}
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
        {errorEjecucion && <p className="mt-4 text-red-600">{errorEjecucion}</p>}
        {!errorEjecucion && resultadosEjecucion && <RunResults results={resultadosEjecucion} hint={hint} />}
        <button
          className="mt-2 ml-2 rounded bg-blue-600 px-4 py-2 text-white disabled:bg-gray-300"
          onClick={() => enviar.mutate()}
          disabled={enviar.isPending}
        >
          {enviar.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner /> Enviando...
            </span>
          ) : (
            'Submit'
          )}
        </button>
        {errorEnvio && <p className="mt-4 text-red-600">{errorEnvio}</p>}
        {!errorEnvio && resultadoEnvio && (
          <SubmitResult envioId={resultadoEnvio.envioId} veredicto={resultadoEnvio.veredicto} mostrarFeedback={user?.categoria === 'invitado'} />
        )}
        {user && user.categoria === 'invitado' && (
          <button className="mt-2 ml-2 rounded bg-purple-600 px-4 py-2 text-white" onClick={() => setMostrarAsistente(true)}>
            Preguntar a Haiku
          </button>
        )}
        {mostrarAsistente && user && (
          <AssistantModal problemaId={problemaId} preguntasUsadas={user.preguntasIaUsadas} onClose={() => setMostrarAsistente(false)} />
        )}
      </div>
    </div>
  )
}
