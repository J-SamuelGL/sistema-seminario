import type { Veredicto } from '../judge/verdict'

export type EstadoEnvio = 'pendiente' | Veredicto

export type CamposAprobacion = {
  estado: EstadoEnvio
  veredictoOriginal: EstadoEnvio | null
  aprobadoPorId: string | null
  aprobadoEn: Date | null
}

export function aplicarAprobacionManual(
  envio: { estado: EstadoEnvio; veredictoOriginal: EstadoEnvio | null },
  adminId: string,
  ahora: Date,
): CamposAprobacion {
  return {
    estado: 'aceptado',
    veredictoOriginal: envio.veredictoOriginal ?? envio.estado,
    aprobadoPorId: adminId,
    aprobadoEn: ahora,
  }
}

export function revertirAprobacionEnvio(envio: {
  veredictoOriginal: EstadoEnvio | null
}): CamposAprobacion {
  if (envio.veredictoOriginal === null) {
    throw new Error('Este envío no tiene una aprobación manual que revertir')
  }
  return {
    estado: envio.veredictoOriginal,
    veredictoOriginal: null,
    aprobadoPorId: null,
    aprobadoEn: null,
  }
}
