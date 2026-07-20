import { createServerFn } from '@tanstack/react-start'
import { agruparClasificacionPorCategoria } from '../standings/calculate'
import { cargarDatosClasificacion } from '../standings/datos'
import { obtenerTorneoActual } from '../tournament/actual'

export const obtenerClasificacion = createServerFn({ method: 'GET' }).handler(
  async () => {
    const torneo = await obtenerTorneoActual()
    if (!torneo) {
      return { iniciado: false as const, invitado: [], junior: [], senior: [] }
    }

    const { clasificacion, torneoIniciadoEn } = await cargarDatosClasificacion(
      torneo.id,
    )
    if (!torneoIniciadoEn) {
      return { iniciado: false as const, invitado: [], junior: [], senior: [] }
    }

    const agrupado = agruparClasificacionPorCategoria(clasificacion)
    return { iniciado: true as const, ...agrupado }
  },
)
