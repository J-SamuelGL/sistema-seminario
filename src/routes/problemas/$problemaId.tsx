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
import type { ResultadoCaso } from '#/server/judge/verdict'

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
  const { problema, user } = Route.useLoaderData()
  const [lenguaje, setLenguaje] = useState(problema?.lenguajesPermitidos[0] ?? '')
  const [codigo, setCodigo] = useState('')
  const [resultadosEjecucion, setResultadosEjecucion] = useState<ResultadoCaso[] | null>(null)
  const [errorEjecucion, setErrorEjecucion] = useState<string | null>(null)
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

  async function handleRun() {
    setEjecutando(true)
    try {
      const { resultados, error } = await ejecutarCodigo({ data: { problemaId: problemaIdActual, lenguaje, codigo } })
      setResultadosEjecucion(resultados)
      setErrorEjecucion(error)
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
      <ProblemDescription titulo={problema.titulo} descripcion={problema.descripcion} dificultad={problema.dificultad} />
      <div>
        <select className="border p-2" value={lenguaje} onChange={(e) => setLenguaje(e.target.value)}>
          {problema.lenguajesPermitidos.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <CodeEditor lenguaje={lenguaje} value={codigo} onChange={setCodigo} />
        <button className="mt-2 rounded bg-gray-700 px-4 py-2 text-white" onClick={handleRun} disabled={ejecutando}>
          {ejecutando ? 'Ejecutando...' : 'Run'}
        </button>
        {errorEjecucion && <p className="mt-4 text-red-600">{errorEjecucion}</p>}
        {!errorEjecucion && resultadosEjecucion && <RunResults results={resultadosEjecucion} />}
        <button
          className="mt-2 ml-2 rounded bg-blue-600 px-4 py-2 text-white"
          onClick={handleSubmit}
          disabled={enviando}
        >
          {enviando ? 'Enviando...' : 'Submit'}
        </button>
        {errorEnvio && <p className="mt-4 text-red-600">{errorEnvio}</p>}
        {!errorEnvio && resultadoEnvio && (
          <SubmitResult envioId={resultadoEnvio.envioId} veredicto={resultadoEnvio.veredicto} />
        )}
        {user && user.categoria === 'junior' && (
          <button
            className="mt-2 ml-2 rounded bg-purple-600 px-4 py-2 text-white"
            onClick={() => setMostrarAsistente(true)}
          >
            Preguntar a Haiku
          </button>
        )}
        {mostrarAsistente && user && (
          <AssistantModal
            problemaId={problemaIdActual}
            preguntasUsadas={user.preguntasIaUsadas}
            onClose={() => setMostrarAsistente(false)}
          />
        )}
      </div>
    </div>
  )
}
