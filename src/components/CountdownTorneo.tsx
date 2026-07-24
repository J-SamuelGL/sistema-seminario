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
  // `null` hasta que el efecto corra en el cliente: si calculáramos `new
  // Date()` ya en el render inicial, el servidor y el primer render del
  // cliente capturarían instantes distintos y el texto no coincidiría
  // (hydration mismatch). Con `null` ambos renders iniciales son idénticos;
  // el reloj real arranca recién en el efecto, solo en el cliente.
  const [ahora, setAhora] = useState<Date | null>(null)

  useEffect(() => {
    setAhora(new Date())
    if (finalizadoEn || !iniciadoEn) return
    const id = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(id)
  }, [iniciadoEn, finalizadoEn])

  if (!iniciadoEn) return null

  if (finalizadoEn) {
    return (
      <span className="font-display text-[13px] font-bold tracking-[0.14em] text-laurel-ink uppercase [font-variant-caps:small-caps]">
        Concluido
      </span>
    )
  }

  if (!ahora) {
    return (
      <span className="font-display text-[15px] font-bold tabular-nums text-laurel-ink">
        {formatearRestante(DURACION_TORNEO_MINUTOS * 60000)}
      </span>
    )
  }

  const finEsperado = iniciadoEn.getTime() + DURACION_TORNEO_MINUTOS * 60000
  const restanteMs = finEsperado - ahora.getTime()
  const urgente = restanteMs <= 15 * 60000

  return (
    <span
      className={`font-display text-[15px] font-bold tabular-nums ${
        urgente ? 'text-red-700' : 'text-laurel-ink'
      }`}
    >
      {formatearRestante(restanteMs)}
    </span>
  )
}
