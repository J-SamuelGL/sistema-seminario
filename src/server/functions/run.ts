import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { problemas, casosPrueba } from '../db/schema'
import { requerirParticipanteIngresado } from '../auth/middleware'
import { ejecutarCasosPrueba } from '../judge/runTestCases'
import type { ResultadoCaso } from '../judge/verdict'

export const ejecutarCodigo = createServerFn({ method: 'POST' })
  .validator((input: { problemaId: string; lenguaje: string; codigo: string }) => input)
  .handler(async ({ data }): Promise<{ resultados: ResultadoCaso[]; error: string | null }> => {
    const request = getRequest()
    await requerirParticipanteIngresado(request.headers)

    const rows = await db.select().from(problemas).where(eq(problemas.id, data.problemaId))
    const problema = rows.length > 0 ? rows[0] : null
    if (!problema) throw new Error('Problema no encontrado')
    const casos = await db.select().from(casosPrueba).where(eq(casosPrueba.problemaId, data.problemaId))

    try {
      const { resultados } = await ejecutarCasosPrueba(
        data.lenguaje,
        data.codigo,
        casos.map((c) => ({ entrada: c.entrada, salidaEsperada: c.salidaEsperada })),
      )
      return { resultados, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { resultados: [], error: `No se pudo ejecutar el código. Intenta de nuevo. (${message})` }
    }
  })
