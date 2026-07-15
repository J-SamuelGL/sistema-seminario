import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { obtenerProblema } from '#/server/functions/problems'
import { ejecutarCodigo } from '#/server/functions/run'
import { enviarCodigo } from '#/server/functions/submit'
import { obtenerUsuarioActual } from '#/server/functions/auth'
import { ProblemDescription } from '#/components/ProblemDescription'
import { CodeEditor } from '#/components/CodeEditor'
import { RunResults } from '#/components/RunResults'
import { SubmitResult } from '#/components/SubmitResult'
import { AssistantModal } from '#/components/AssistantModal'
import { serializarCanonico } from '#/server/judge/serializar'
import type { ResultadoCasoPublico } from '#/server/judge/resultadoPublico'

export const Route = createFileRoute('/problemas/$problemaId')({
  loader: async ({ params }) => {
    const [datosProblema, user] = await Promise.all([
      obtenerProblema({ data: params.problemaId }),
      obtenerUsuarioActual().catch(() => null),
    ])
    return { ...datosProblema, user }
  },
  component: ProblemDetailPage,
})

function ProblemDetailPage() {
  const { problemaId } = Route.useParams()
  const { problema, casosPrueba, lenguajes, user } = Route.useLoaderData()
  const [lenguaje, setLenguaje] = useState<string>(lenguajes[0]?.lenguaje ?? '')
  const [codigo, setCodigo] = useState(lenguajes[0]?.codigoInicial ?? '')
  const [resultadosEjecucion, setResultadosEjecucion] = useState<ResultadoCasoPublico[] | null>(null)
  const [errorEjecucion, setErrorEjecucion] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [ejecutando, setEjecutando] = useState(false)
  const [resultadoEnvio, setResultadoEnvio] = useState<{ envioId: string; veredicto: string } | null>(null)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [mostrarAsistente, setMostrarAsistente] = useState(false)

  if (!problema) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold">Problema no encontrado</h1>
        <p className="text-red-600">No existe un problema con el id "{problemaId}".</p>
      </div>
    )
  }

  const problemaIdActual = problema.id
  const ejemplos = casosPrueba
    .filter((c) => c.visible)
    .map((c) => ({ argumentos: c.argumentos, salidaEsperadaTexto: serializarCanonico(c.salidaEsperada, problema.tipoRetorno) }))

  function handleLenguajeChange(nuevoLenguaje: string) {
    setLenguaje(nuevoLenguaje)
    const config = lenguajes.find((l) => l.lenguaje === nuevoLenguaje)
    setCodigo(config?.codigoInicial ?? '')
  }

  async function handleRun() {
    setEjecutando(true)
    try {
      const { resultados, error, hint: nuevoHint } = await ejecutarCodigo({
        data: { problemaId: problemaIdActual, lenguaje, codigo },
      })
      setResultadosEjecucion(resultados)
      setErrorEjecucion(error)
      setHint(nuevoHint)
    } finally {
      setEjecutando(false)
    }
  }

  async function handleSubmit() {
    setEnviando(true)
    try {
      const resultado = await enviarCodigo({ data: { problemaId: problemaIdActual, lenguaje, codigo } })
      if (resultado.error || !resultado.veredicto) {
        setErrorEnvio(resultado.error ?? 'No se pudo evaluar el envío.')
        setResultadoEnvio(null)
      } else {
        setResultadoEnvio({ envioId: resultado.envioId, veredicto: resultado.veredicto })
        setErrorEnvio(null)
      }
    } catch (err) {
      setErrorEnvio(err instanceof Error ? err.message : String(err))
      setResultadoEnvio(null)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <ProblemDescription titulo={problema.titulo} descripcion={problema.descripcion} dificultad={problema.dificultad} ejemplos={ejemplos} />
      <div>
        <select className="border p-2" value={lenguaje} onChange={(e) => handleLenguajeChange(e.target.value)}>
          {lenguajes.map((l) => (
            <option key={l.lenguaje} value={l.lenguaje}>
              {l.lenguaje}
            </option>
          ))}
        </select>
        <CodeEditor lenguaje={lenguaje} value={codigo} onChange={setCodigo} />
        <button className="mt-2 rounded bg-gray-700 px-4 py-2 text-white" onClick={handleRun} disabled={ejecutando}>
          {ejecutando ? 'Ejecutando...' : 'Run'}
        </button>
        {errorEjecucion && <p className="mt-4 text-red-600">{errorEjecucion}</p>}
        {!errorEjecucion && resultadosEjecucion && <RunResults results={resultadosEjecucion} hint={hint} />}
        <button className="mt-2 ml-2 rounded bg-blue-600 px-4 py-2 text-white" onClick={handleSubmit} disabled={enviando}>
          {enviando ? 'Enviando...' : 'Submit'}
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
          <AssistantModal problemaId={problemaIdActual} preguntasUsadas={user.preguntasIaUsadas} onClose={() => setMostrarAsistente(false)} />
        )}
      </div>
    </div>
  )
}
