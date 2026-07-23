import { createServerFn } from '@tanstack/react-start'
import { agruparClasificacionPorCategoria } from '../standings/calculate'
import { cargarDatosClasificacion } from '../standings/datos'
import { cargarEstadisticasProblemas } from '../standings/estadisticasProblemasDatos'
import { cargarActividadEnVivo } from '../standings/actividadEnVivoDatos'
import { cargarActividadReciente } from '../standings/actividadRecienteDatos'
import {
  cargarBeneficiosUsados,
  cargarCupoIaRestante,
} from '../standings/beneficiosUsadosDatos'
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

export const obtenerActividadReciente = createServerFn({
  method: 'GET',
}).handler(async () => {
  const torneo = await obtenerTorneoActual()
  if (!torneo) return []
  return cargarActividadReciente(torneo.id, 15)
})

export const obtenerBeneficiosUsados = createServerFn({
  method: 'GET',
}).handler(async () => {
  const torneo = await obtenerTorneoActual()
  if (!torneo) return { beneficios: [], cupoIa: [] }
  const [beneficios, cupoIa] = await Promise.all([
    cargarBeneficiosUsados(torneo.id),
    cargarCupoIaRestante(torneo.id),
  ])
  return { beneficios, cupoIa }
})

export const obtenerEstadisticasProblemas = createServerFn({
  method: 'GET',
}).handler(async () => {
  const torneo = await obtenerTorneoActual()
  if (!torneo) {
    return {
      todas: [],
      resueltosPorTodos: [],
      resueltosPorNadie: [],
      enLlamasPorGrupo: {},
    }
  }
  return cargarEstadisticasProblemas(torneo.id)
})

export const obtenerActividadEnVivo = createServerFn({ method: 'GET' }).handler(
  async () => {
    const torneo = await obtenerTorneoActual()
    if (!torneo) return []
    return cargarActividadEnVivo(torneo.id)
  },
)
