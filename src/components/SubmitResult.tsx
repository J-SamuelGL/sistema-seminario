import { useEffect, useState } from 'react'
import { obtenerEnvio } from '#/server/functions/submit'

export function SubmitResult({ envioId, veredicto }: { envioId: string; veredicto: string }) {
  const [comentario, setComentario] = useState<string | null>(null)

  useEffect(() => {
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
  }, [envioId])

  return (
    <div className="mt-4 rounded border p-4">
      <p className="font-bold">Veredicto: {veredicto}</p>
      <p className="mt-2 text-sm text-gray-600">{comentario ?? 'Generando feedback...'}</p>
    </div>
  )
}
