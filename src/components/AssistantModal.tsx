import { useState } from 'react'
import { preguntarAsistente } from '#/server/functions/assistant'
import { Markdown } from '#/components/Markdown'

export function AssistantModal({
  problemaId,
  preguntasUsadas,
  onClose,
}: {
  problemaId: string
  preguntasUsadas: number
  onClose: () => void
}) {
  const [pregunta, setPregunta] = useState('')
  const [turnos, setTurnos] = useState<{ pregunta: string; respuesta: string }[]>([])
  const [restantes, setRestantes] = useState(3 - preguntasUsadas)
  const [preguntando, setPreguntando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAsk() {
    setPreguntando(true)
    try {
      const resultado = await preguntarAsistente({ data: { problemaId, pregunta } })
      setTurnos([...turnos, { pregunta, respuesta: resultado.respuesta }])
      setRestantes(resultado.preguntasRestantes)
      setPregunta('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPreguntando(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-96 flex-col rounded bg-white p-4">
        <div className="flex shrink-0 justify-between">
          <h2 className="font-bold">Preguntar a Haiku</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <p className="shrink-0 text-sm text-gray-500">
          Preguntas restantes: {restantes}/3
        </p>
        {error && <p className="mt-2 shrink-0 text-sm text-red-600">{error}</p>}
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
          {turnos.map((t, i) => (
            <div key={i} className="mt-2 text-sm first:mt-0">
              <p className="font-bold">Tú: {t.pregunta}</p>
              <Markdown>{t.respuesta}</Markdown>
            </div>
          ))}
        </div>
        <textarea
          className="mt-2 w-full shrink-0 border p-2"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          disabled={restantes <= 0}
          placeholder="Ej: ¿cómo uso .filter en JavaScript?"
        />
        <button
          className="mt-2 w-full shrink-0 rounded bg-green-600 px-4 py-2 text-white disabled:bg-gray-300"
          onClick={handleAsk}
          disabled={restantes <= 0 || preguntando || !pregunta.trim()}
        >
          {restantes <= 0
            ? 'Ya usaste tus 3 preguntas'
            : preguntando
              ? 'Preguntando...'
              : 'Preguntar'}
        </button>
      </div>
    </div>
  )
}
