export type RegistroEnvio = {
  usuarioId: string
  problemaId: string
  estadoProgreso: 'pendiente' | 'completado' | 'aprobado_manual'
  creadoEn: Date
}

export type RegistroUsuario = {
  id: string
  nombre: string
  categoria: 'invitado' | 'junior' | 'senior'
}

export type RegistroProblema = { id: string; puntos: number }

export type FilaClasificacion = {
  usuarioId: string
  nombre: string
  categoria: 'invitado' | 'junior' | 'senior'
  cantidadResueltos: number
  puntosTotales: number
  minutosPenalizacionTotal: number
}

export function calcularClasificacion(
  usuarios: RegistroUsuario[],
  envios: RegistroEnvio[],
  problemas: RegistroProblema[],
  torneoIniciadoEn: Date,
): FilaClasificacion[] {
  const puntosPorProblema = new Map(problemas.map((p) => [p.id, p.puntos]))

  const resueltosPorUsuario = new Map<string, RegistroEnvio[]>()
  for (const e of envios) {
    if (e.estadoProgreso === 'pendiente') continue
    if (!resueltosPorUsuario.has(e.usuarioId))
      resueltosPorUsuario.set(e.usuarioId, [])
    resueltosPorUsuario.get(e.usuarioId)!.push(e)
  }

  const filas = usuarios.map((usuario): FilaClasificacion => {
    const resueltos = resueltosPorUsuario.get(usuario.id) ?? []

    let cantidadResueltos = 0
    let puntosTotales = 0
    let minutosPenalizacionTotal = 0

    for (const envio of resueltos) {
      cantidadResueltos += 1
      puntosTotales += puntosPorProblema.get(envio.problemaId) ?? 0
      const minutosDesdeInicio = Math.floor(
        (envio.creadoEn.getTime() - torneoIniciadoEn.getTime()) / 60000,
      )
      minutosPenalizacionTotal += minutosDesdeInicio
    }

    return {
      usuarioId: usuario.id,
      nombre: usuario.nombre,
      categoria: usuario.categoria,
      cantidadResueltos,
      puntosTotales,
      minutosPenalizacionTotal,
    }
  })

  return filas.sort((a, b) => {
    if (b.puntosTotales !== a.puntosTotales)
      return b.puntosTotales - a.puntosTotales
    return a.minutosPenalizacionTotal - b.minutosPenalizacionTotal
  })
}

export function agruparClasificacionPorCategoria(filas: FilaClasificacion[]) {
  return {
    invitado: filas.filter((f) => f.categoria === 'invitado'),
    junior: filas.filter((f) => f.categoria === 'junior'),
    senior: filas.filter((f) => f.categoria === 'senior'),
  }
}
