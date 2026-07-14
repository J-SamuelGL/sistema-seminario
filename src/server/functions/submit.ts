import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { problemas, casosPrueba, envios, estadoTorneo } from '../db/schema'
import { requerirParticipanteIngresado } from '../auth/middleware'
import { ejecutarCasosPrueba } from '../judge/runTestCases'
import { generarComentarioEnvio } from '../claude/feedback'
import { asegurarIniciado } from '../tournament/guard'

export const enviarCodigo = createServerFn({ method: 'POST' })
  .validator((input: { problemaId: string; lenguaje: string; codigo: string }) => input)
  .handler(async ({ data }): Promise<{ envioId: string; veredicto: string | null; error: string | null }> => {
    const request = getRequest()
    const user = await requerirParticipanteIngresado(request.headers)

    const filasEstado = await db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))
    const estado = filasEstado.length > 0 ? filasEstado[0] : null
    asegurarIniciado(estado ?? { iniciadoEn: null })

    const filasProblema = await db.select().from(problemas).where(eq(problemas.id, data.problemaId))
    const problema = filasProblema.length > 0 ? filasProblema[0] : null
    if (!problema) throw new Error('Problema no encontrado')
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
        casos.map((c) => ({ entrada: c.entrada, salidaEsperada: c.salidaEsperada })),
      )
      const salidaError = resultados.find((r) => r.salidaError)?.salidaError ?? ''

      await db.update(envios).set({ estado: veredicto }).where(eq(envios.id, envioId))

      generarComentarioEnvio({
        tituloProblema: problema.titulo,
        descripcionProblema: problema.descripcion,
        codigo: data.codigo,
        veredicto,
        salidaError,
      })
        .then((comentario) =>
          db.update(envios).set({ comentarioClaude: comentario }).where(eq(envios.id, envioId)),
        )
        .catch((err: unknown) => console.error('Comentario de Claude falló', err))

      return { envioId, veredicto, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        envioId,
        veredicto: null,
        error: `No se pudo evaluar el envío. Intenta de nuevo. (${message})`,
      }
    }
  })

export const obtenerEnvio = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirParticipanteIngresado(request.headers)
    const rows = await db.select().from(envios).where(eq(envios.id, data))
    return rows.length > 0 ? rows[0] : null
  })
