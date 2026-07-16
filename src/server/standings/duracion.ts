export type RegistroResuelto = {
  problemaId: string
  creadoEn: Date
}

export type FilaDuracion = {
  problemaId: string
  duracionMinutos: number
}

export function calcularDuraciones(
  resueltos: RegistroResuelto[],
  torneoIniciadoEn: Date,
): FilaDuracion[] {
  const ordenados = resueltos
    .slice()
    .sort((a, b) => a.creadoEn.getTime() - b.creadoEn.getTime())

  const filas: FilaDuracion[] = []
  let ultimoTimestamp = torneoIniciadoEn
  for (const resuelto of ordenados) {
    const duracionMinutos = Math.floor(
      (resuelto.creadoEn.getTime() - ultimoTimestamp.getTime()) / 60000,
    )
    filas.push({ problemaId: resuelto.problemaId, duracionMinutos })
    ultimoTimestamp = resuelto.creadoEn
  }

  return filas
}
