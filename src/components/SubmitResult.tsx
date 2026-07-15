import { useEffect, useState } from 'react'
import { obtenerEnvio } from '#/server/functions/submit'
import { Markdown } from '#/components/Markdown'

export function SubmitResult({
  envioId,
  veredicto,
  mostrarFeedback,
}: {
  envioId: string
  veredicto: string
  mostrarFeedback: boolean
}) {
  const [comentario, setComentario] = useState<string | null>(null)

  useEffect(() => {
    if (!mostrarFeedback) return
    let cancelado = false
    const interval = setInterval(() => {
      obtenerEnvio({ data: envioId })
        .then((envio) => {
          if (!cancelado && envio?.comentarioClaude) {
            setComentario(envio.comentarioClaude)
            clearInterval(interval)
          }
        })
        .catch((err: unknown) => console.error('No se pudo consultar el envío', err))
    }, 2000)
    return () => {
      cancelado = true
      clearInterval(interval)
    }
  }, [envioId, mostrarFeedback])

  return (
    <div className="mt-4 rounded border p-4">
      <p className="font-bold">Veredicto: {veredicto}</p>
      {mostrarFeedback && (
        <div className="mt-2 text-gray-600">
          {comentario ? <Markdown>{comentario}</Markdown> : 'Generando feedback...'}
        </div>
      )}
    </div>
  )
}
