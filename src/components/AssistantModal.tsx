import { useState } from 'react'
import { askAssistant } from '#/server/functions/assistant'

export function AssistantModal({
  problemId,
  questionsUsed,
  onClose,
}: {
  problemId: string
  questionsUsed: number
  onClose: () => void
}) {
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<{ question: string; answer: string }[]>([])
  const [remaining, setRemaining] = useState(2 - questionsUsed)
  const [isAsking, setIsAsking] = useState(false)

  async function handleAsk() {
    setIsAsking(true)
    try {
      const result = await askAssistant({ data: { problemId, question } })
      setTurns([...turns, { question, answer: result.answer }])
      setRemaining(result.questionsRemaining)
      setQuestion('')
    } finally {
      setIsAsking(false)
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
          Preguntas restantes: {remaining}/2
        </p>
        {turns.map((t, i) => (
          <div key={i} className="mt-2 text-sm">
            <p className="font-bold">Tú: {t.question}</p>
            <p>Haiku: {t.answer}</p>
          </div>
        ))}
        <textarea
          className="mt-2 w-full border p-2"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={remaining <= 0}
          placeholder="Ej: ¿cómo uso .filter en JavaScript?"
        />
        <button
          className="mt-2 w-full rounded bg-green-600 px-4 py-2 text-white disabled:bg-gray-300"
          onClick={handleAsk}
          disabled={remaining <= 0 || isAsking || !question.trim()}
        >
          {remaining <= 0
            ? 'Ya usaste tus 2 preguntas'
            : isAsking
              ? 'Preguntando...'
              : 'Preguntar'}
        </button>
      </div>
    </div>
  )
}
