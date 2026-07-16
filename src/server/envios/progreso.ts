import { z } from 'zod'
import { idSchema } from '../validacion/comun'

export const estadoProgresoSchema = z.enum(['pendiente', 'completado', 'aprobado_manual'])
export type EstadoProgreso = z.infer<typeof estadoProgresoSchema>

export const actualizarEstadoProgresoSchema = z.object({
  usuarioId: idSchema,
  problemaId: idSchema,
  estadoProgreso: estadoProgresoSchema,
})
export type ActualizarEstadoProgreso = z.infer<typeof actualizarEstadoProgresoSchema>

export type CamposActualizacionProgreso = {
  estadoProgreso: EstadoProgreso
  aprobadoPorId: string
  aprobadoEn: Date
  creadoEn?: Date
}

export function aplicarCambioEstadoManual(
  nuevoEstado: EstadoProgreso,
  adminId: string,
  ahora: Date,
  ultimaEjecucionEn: Date | null,
): CamposActualizacionProgreso {
  if (nuevoEstado === 'pendiente') {
    return { estadoProgreso: nuevoEstado, aprobadoPorId: adminId, aprobadoEn: ahora }
  }
  return {
    estadoProgreso: nuevoEstado,
    aprobadoPorId: adminId,
    aprobadoEn: ahora,
    creadoEn: ultimaEjecucionEn ?? ahora,
  }
}
