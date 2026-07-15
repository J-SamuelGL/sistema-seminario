export type RegistroEnvio = {
  usuarioId: string
  problemaId: string
  estado: 'pendiente' | 'aceptado' | 'respuesta_incorrecta' | 'error_ejecucion' | 'tiempo_excedido'
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

  const porUsuario = new Map<string, RegistroEnvio[]>()
  for (const e of envios) {
    if (e.estado === 'pendiente') continue
    if (!porUsuario.has(e.usuarioId)) porUsuario.set(e.usuarioId, [])
    porUsuario.get(e.usuarioId)!.push(e)
  }

  const filas = usuarios.map((usuario): FilaClasificacion => {
    const enviosUsuario = (porUsuario.get(usuario.id) ?? []).slice().sort(
      (a, b) => a.creadoEn.getTime() - b.creadoEn.getTime(),
    )
    const porProblema = new Map<string, RegistroEnvio[]>()
    for (const e of enviosUsuario) {
      if (!porProblema.has(e.problemaId)) porProblema.set(e.problemaId, [])
      porProblema.get(e.problemaId)!.push(e)
    }

    let cantidadResueltos = 0
    let puntosTotales = 0
    let minutosPenalizacionTotal = 0

    for (const [problemaId, enviosProblema] of porProblema) {
      const indiceAceptado = enviosProblema.findIndex((e) => e.estado === 'aceptado')
      if (indiceAceptado === -1) continue
      cantidadResueltos += 1
      puntosTotales += puntosPorProblema.get(problemaId) ?? 0
      const envioAceptado = enviosProblema[indiceAceptado]
      const intentosFallidosAntes = indiceAceptado
      const minutosDesdeInicio = Math.floor(
        (envioAceptado.creadoEn.getTime() - torneoIniciadoEn.getTime()) / 60000,
      )
      minutosPenalizacionTotal += minutosDesdeInicio + intentosFallidosAntes * 20
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
    if (b.puntosTotales !== a.puntosTotales) return b.puntosTotales - a.puntosTotales
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
