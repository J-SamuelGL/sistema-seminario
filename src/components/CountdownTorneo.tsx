import { useEffect, useState } from 'react'
import { DURACION_TORNEO_MINUTOS } from '#/shared/torneo'

export function formatearRestante(ms: number): string {
  const totalSegundos = Math.max(Math.floor(ms / 1000), 0)
  const horas = Math.floor(totalSegundos / 3600)
  const minutos = Math.floor((totalSegundos % 3600) / 60)
  const segundos = totalSegundos % 60
  const mm = String(minutos).padStart(2, '0')
  const ss = String(segundos).padStart(2, '0')
  return horas > 0 ? `${horas}:${mm}:${ss}` : `${mm}:${ss}`
}

export function CountdownTorneo({
  iniciadoEn,
  finalizadoEn,
}: {
  iniciadoEn: Date | null
  finalizadoEn: Date | null
}) {
  const [ahora, setAhora] = useState(() => new Date())

  useEffect(() => {
    if (finalizadoEn || !iniciadoEn) return
    const id = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(id)
  }, [iniciadoEn, finalizadoEn])

  if (!iniciadoEn) return null

  if (finalizadoEn) {
    return (
      <span className="font-display text-[13px] font-bold tracking-[0.14em] text-[oklch(78%_0.14_152)] uppercase [font-variant-caps:small-caps]">
        Concluido
      </span>
    )
  }

  const finEsperado = iniciadoEn.getTime() + DURACION_TORNEO_MINUTOS * 60000
  const restanteMs = finEsperado - ahora.getTime()
  const urgente = restanteMs <= 15 * 60000

  return (
    <span
      className={`font-display text-[15px] font-bold tabular-nums ${
        urgente ? 'text-[oklch(78%_0.16_25)]' : 'text-[oklch(78%_0.14_152)]'
      }`}
    >
      {formatearRestante(restanteMs)}
    </span>
  )
}
