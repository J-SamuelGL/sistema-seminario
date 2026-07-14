import { useState } from 'react'
import { preguntarAsistente } from '#/server/functions/assistant'

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
  const [restantes, setRestantes] = useState(2 - preguntasUsadas)
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
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="w-96 rounded bg-white p-4">
        <div className="flex justify-between">
          <h2 className="font-bold">Preguntar a Haiku</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <p className="text-sm text-gray-500">
          Preguntas restantes: {restantes}/2
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {turnos.map((t, i) => (
          <div key={i} className="mt-2 text-sm">
            <p className="font-bold">Tú: {t.pregunta}</p>
            <p>Haiku: {t.respuesta}</p>
          </div>
        ))}
        <textarea
          className="mt-2 w-full border p-2"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          disabled={restantes <= 0}
          placeholder="Ej: ¿cómo uso .filter en JavaScript?"
        />
        <button
          className="mt-2 w-full rounded bg-green-600 px-4 py-2 text-white disabled:bg-gray-300"
          onClick={handleAsk}
          disabled={restantes <= 0 || preguntando || !pregunta.trim()}
        >
          {restantes <= 0
            ? 'Ya usaste tus 2 preguntas'
            : preguntando
              ? 'Preguntando...'
              : 'Preguntar'}
        </button>
      </div>
    </div>
  )
}
