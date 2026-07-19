import { createServerFn } from '@tanstack/react-start'
import { agruparClasificacionPorCategoria } from '../standings/calculate'
import { cargarDatosClasificacion } from '../standings/datos'

export const obtenerClasificacion = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { clasificacion, torneoIniciadoEn } = await cargarDatosClasificacion()
    if (!torneoIniciadoEn) {
      return { iniciado: false as const, invitado: [], junior: [], senior: [] }
    }

    const agrupado = agruparClasificacionPorCategoria(clasificacion)
    return { iniciado: true as const, ...agrupado }
  },
)
