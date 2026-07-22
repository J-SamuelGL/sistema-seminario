import { useState } from 'react'
import { preguntarAsistente } from '#/server/functions/assistant'
import { Markdown } from '#/components/Markdown'
import { LoadingButton } from '#/components/LoadingButton'
import { useToastMutation } from '#/components/useToastMutation'
import { useModalA11y } from '#/components/useModalA11y'
import { CARD, GRADIENT_TEXT, INPUT_BASE } from '#/components/brandStyles'

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
  const [turnos, setTurnos] = useState<
    { pregunta: string; respuesta: string }[]
  >([])
  const [restantes, setRestantes] = useState(3 - preguntasUsadas)

  const preguntar = useToastMutation({
    mutationFn: (preguntaEnviada: string) =>
      preguntarAsistente({ data: { problemaId, pregunta: preguntaEnviada } }),
    onSuccess: (resultado, preguntaEnviada) => {
      setTurnos((prev) => [
        ...prev,
        { pregunta: preguntaEnviada, respuesta: resultado.respuesta },
      ])
      setRestantes(resultado.preguntasRestantes)
      setPregunta('')
    },
  })

  function handleAsk() {
    preguntar.mutate(pregunta)
  }

  const modalRef = useModalA11y({ onClose })

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asistente-titulo"
        className={`${CARD} flex max-h-[85vh] w-96 flex-col p-5`}
      >
        <div className="flex shrink-0 justify-between">
          <h2
            id="asistente-titulo"
            className={`font-display font-bold ${GRADIENT_TEXT}`}
          >
            Preguntar a Haiku
          </h2>
          <button className="text-ink-faint hover:text-ink" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="shrink-0 text-sm text-ink-soft">
          Preguntas restantes: {restantes}/3
        </p>
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
          {turnos.map((t, i) => (
            <div key={i} className="mt-2 text-sm first:mt-0">
              <p className="font-bold text-ink">Tú: {t.pregunta}</p>
              <Markdown>{t.respuesta}</Markdown>
            </div>
          ))}
        </div>
        <textarea
          className={`mt-2 w-full shrink-0 ${INPUT_BASE}`}
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          disabled={restantes <= 0}
          placeholder="Ej: ¿cómo uso .filter en JavaScript?"
        />
        <LoadingButton
          className="mt-2 w-full shrink-0 rounded-sm bg-laurel px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:bg-line disabled:text-ink-faint"
          onClick={handleAsk}
          disabled={restantes <= 0 || !pregunta.trim()}
          isPending={preguntar.isPending}
          label={restantes <= 0 ? 'Ya usaste tus 3 preguntas' : 'Preguntar'}
          pendingLabel="Preguntando..."
        />
      </div>
    </div>
  )
}
