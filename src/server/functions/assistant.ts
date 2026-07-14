import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, lt, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { problemas, preguntasIa, usuarios } from '../db/schema'
import { requerirParticipanteIngresado } from '../auth/middleware'
import { puedePreguntar } from '../assistant/limit'
import { responderPreguntaJunior } from '../claude/assistant'

export const preguntarAsistente = createServerFn({ method: 'POST' })
  .validator((input: { problemaId: string; pregunta: string }) => input)
  .handler(async ({ data }) => {
    const request = getRequest()
    const user = await requerirParticipanteIngresado(request.headers)

    if (
      !user.categoria ||
      !puedePreguntar({
        categoria: user.categoria,
        preguntasIaUsadas: user.preguntasIaUsadas,
      })
    ) {
      throw new Error('AI_LIMIT_REACHED')
    }

    // Reserva atómicamente un cupo de pregunta antes de llamar a Claude, para que dos
    // solicitudes concurrentes no puedan ambas observar preguntasIaUsadas < 2 y ambas
    // avanzar. La cláusula WHERE se evalúa contra la fila actual de la BD, no contra
    // el valor `user` en memoria (potencialmente desactualizado), cerrando la ventana de carrera.
    const resultado = await db
      .update(usuarios)
      .set({ preguntasIaUsadas: sql`${usuarios.preguntasIaUsadas} + 1` })
      .where(and(eq(usuarios.id, user.id), lt(usuarios.preguntasIaUsadas, 2)))
    if (resultado[0].affectedRows === 0) throw new Error('AI_LIMIT_REACHED')

    const filasUsuario = await db.select().from(usuarios).where(eq(usuarios.id, user.id))
    const usuarioActualizado = filasUsuario.length > 0 ? filasUsuario[0] : null
    if (!usuarioActualizado) throw new Error('AI_LIMIT_REACHED')

    const filasProblema = await db
      .select()
      .from(problemas)
      .where(eq(problemas.id, data.problemaId))
    const problema = filasProblema.length > 0 ? filasProblema[0] : null
    if (!problema) throw new Error('Problema no encontrado')

    const respuesta = await responderPreguntaJunior({
      descripcionProblema: problema.descripcion,
      pregunta: data.pregunta,
    })

    await db.insert(preguntasIa).values({
      usuarioId: user.id,
      problemaId: data.problemaId,
      pregunta: data.pregunta,
      respuesta,
    })

    return { respuesta, preguntasRestantes: 2 - usuarioActualizado.preguntasIaUsadas }
  })
