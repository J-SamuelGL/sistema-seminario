import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { problemas, casosPrueba, corridas } from '../db/schema'
import { requerirParticipanteIngresado } from '../auth/middleware'
import { ejecutarCasosPrueba } from '../judge/runTestCases'
import { debeMostrarHint } from '../judge/hintCadence'
import { generarComentarioEnvio } from '../claude/feedback'
import type { ResultadoCaso } from '../judge/verdict'

export const ejecutarCodigo = createServerFn({ method: 'POST' })
  .validator((input: { problemaId: string; lenguaje: string; codigo: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<{ resultados: ResultadoCaso[]; error: string | null; hint: string | null }> => {
      const request = getRequest()
      const user = await requerirParticipanteIngresado(request.headers)

      const rows = await db.select().from(problemas).where(eq(problemas.id, data.problemaId))
      const problema = rows.length > 0 ? rows[0] : null
      if (!problema) throw new Error('Problema no encontrado')
      const casos = await db
        .select()
        .from(casosPrueba)
        .where(eq(casosPrueba.problemaId, data.problemaId))

      try {
        const { resultados, veredicto } = await ejecutarCasosPrueba(
          data.lenguaje,
          data.codigo,
          casos.map((c) => ({ entrada: c.entrada, salidaEsperada: c.salidaEsperada })),
        )

        let hint: string | null = null
        if (user.categoria === 'invitado') {
          await db
            .insert(corridas)
            .values({ usuarioId: user.id, problemaId: data.problemaId, contador: 1 })
            .onDuplicateKeyUpdate({ set: { contador: sql`${corridas.contador} + 1` } })
          const filasCorrida = await db
            .select()
            .from(corridas)
            .where(and(eq(corridas.usuarioId, user.id), eq(corridas.problemaId, data.problemaId)))
          const contador = filasCorrida.length > 0 ? filasCorrida[0].contador : 1

          if (debeMostrarHint(contador)) {
            const salidaError = resultados.find((r) => r.salidaError)?.salidaError ?? ''
            hint = await generarComentarioEnvio({
              tituloProblema: problema.titulo,
              descripcionProblema: problema.descripcion,
              codigo: data.codigo,
              veredicto,
              salidaError,
            })
          }
        }

        return { resultados, error: null, hint }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return {
          resultados: [],
          error: `No se pudo ejecutar el código. Intenta de nuevo. (${message})`,
          hint: null,
        }
      }
    },
  )
