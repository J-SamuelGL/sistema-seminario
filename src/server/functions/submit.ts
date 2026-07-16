import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { problemas, casosPrueba, problemaLenguajes, envios, estadoTorneo } from '../db/schema'
import { requerirParticipanteIngresado } from '../auth/middleware'
import { ejecutarCasosPrueba } from '../judge/runTestCases'
import { ocultarDetalleCasosNoVisibles } from '../judge/resultadoPublico'
import { generarComentarioEnvio } from '../claude/feedback'
import { asegurarIniciado } from '../tournament/guard'
import { datosEjecucionSchema } from '../envios/validar'
import { idSchema } from '../validacion/comun'
import type { ResultadoCasoPublico } from '../judge/resultadoPublico'

export const enviarCodigo = createServerFn({ method: 'POST' })
  .validator(datosEjecucionSchema)
  .handler(
    async ({
      data,
    }): Promise<{ envioId: string; veredicto: string | null; resultados: ResultadoCasoPublico[]; error: string | null }> => {
      const request = getRequest()
      const user = await requerirParticipanteIngresado(request.headers)

      const filasEstado = await db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))
      const estado = filasEstado.length > 0 ? filasEstado[0] : null
      asegurarIniciado(estado ?? { iniciadoEn: null })

      const filasProblema = await db.select().from(problemas).where(eq(problemas.id, data.problemaId))
      const problema = filasProblema.length > 0 ? filasProblema[0] : null
      if (!problema) throw new Error('Problema no encontrado')

      const filasLenguaje = await db
        .select()
        .from(problemaLenguajes)
        .where(and(eq(problemaLenguajes.problemaId, data.problemaId), eq(problemaLenguajes.lenguaje, data.lenguaje)))
      const filaLenguaje = filasLenguaje.length > 0 ? filasLenguaje[0] : null
      if (!filaLenguaje) throw new Error('Lenguaje no habilitado para este problema')

      const casos = await db.select().from(casosPrueba).where(eq(casosPrueba.problemaId, data.problemaId))

      const envioId = crypto.randomUUID()
      await db.insert(envios).values({
        id: envioId,
        usuarioId: user.id,
        problemaId: data.problemaId,
        codigo: data.codigo,
        lenguaje: data.lenguaje,
        estado: 'pendiente',
      })

      try {
        const { resultados, veredicto } = await ejecutarCasosPrueba(
          data.lenguaje,
          data.codigo,
          { nombreFuncion: filaLenguaje.nombreFuncion, parametros: problema.parametros, tipoRetorno: problema.tipoRetorno },
          casos.map((c) => ({ argumentos: c.argumentos, salidaEsperada: c.salidaEsperada, visible: c.visible })),
        )
        const salidaError = resultados.find((r) => r.visible && r.salidaError)?.salidaError ?? ''

        await db.update(envios).set({ estado: veredicto, resultados }).where(eq(envios.id, envioId))

        if (user.categoria === 'invitado') {
          generarComentarioEnvio({
            tituloProblema: problema.titulo,
            descripcionProblema: problema.descripcion,
            codigo: data.codigo,
            veredicto,
            salidaError,
          })
            .then((comentario) => db.update(envios).set({ comentarioClaude: comentario }).where(eq(envios.id, envioId)))
            .catch((err: unknown) => console.error('Comentario de Claude falló', err))
        }

        return { envioId, veredicto, resultados: ocultarDetalleCasosNoVisibles(resultados), error: null }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return {
          envioId,
          veredicto: null,
          resultados: [],
          error: `No se pudo evaluar el envío. Intenta de nuevo. (${message})`,
        }
      }
    },
  )

export const obtenerEnvio = createServerFn({ method: 'GET' })
  .validator(idSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirParticipanteIngresado(request.headers)
    const rows = await db.select().from(envios).where(eq(envios.id, data))
    return rows.length > 0 ? rows[0] : null
  })
