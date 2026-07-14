import { createServerFn } from '@tanstack/react-start'
import { eq, isNotNull } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios, envios, estadoTorneo } from '../db/schema'
import { calcularClasificacion, agruparClasificacionPorCategoria } from '../standings/calculate'
import type { RegistroUsuario } from '../standings/calculate'

export const obtenerClasificacion = createServerFn({ method: 'GET' }).handler(async () => {
  const filasEstado = await db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))
  const estado = filasEstado.length > 0 ? filasEstado[0] : null
  if (!estado?.iniciadoEn) {
    return { iniciado: false as const, senior: [], junior: [] }
  }

  const todosUsuarios = await db.select().from(usuarios).where(isNotNull(usuarios.categoria))
  const todosEnvios = await db.select().from(envios)

  const usuariosElegibles: Array<RegistroUsuario> = todosUsuarios
    .filter((u): u is typeof u & { categoria: 'senior' | 'junior' } => u.categoria !== null)
    .map((u) => ({ id: u.id, nombre: u.name, categoria: u.categoria }))

  const filas = calcularClasificacion(
    usuariosElegibles,
    todosEnvios.map((e) => ({
      usuarioId: e.usuarioId,
      problemaId: e.problemaId,
      estado: e.estado,
      creadoEn: e.creadoEn,
    })),
    estado.iniciadoEn,
  )
  const agrupado = agruparClasificacionPorCategoria(filas)
  return { iniciado: true as const, ...agrupado }
})
