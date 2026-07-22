import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { obtenerUnaFila } from '../db/uno'
import {
  problemas,
  casosPrueba,
  problemaLenguajes,
  corridas,
  envios,
} from '../db/schema'
import { requerirParticipanteIngresado } from '../auth/middleware'
import { ejecutarCasosPrueba } from '../judge/runTestCases'
import { ocultarDetalleCasosNoVisibles } from '../judge/resultadoPublico'
import { debeMostrarHint } from '../judge/hintCadence'
import { generarComentarioEnvio } from '../claude/feedback'
import { asegurarIniciado } from '../tournament/guard'
import { obtenerTorneoActual } from '../tournament/actual'
import { datosEjecucionSchema } from '../envios/validar'
import { calcularResueltoParaUsuario } from '../envios/resuelto'
import type { ResultadoCasoPublico } from '../judge/resultadoPublico'

export const ejecutarCodigo = createServerFn({ method: 'POST' })
  .validator(datosEjecucionSchema)
  .handler(
    async ({
      data,
    }): Promise<{
      resultados: ResultadoCasoPublico[]
      error: string | null
      hint: string | null
      resuelto: { duracionMinutos: number; puntos: number } | null
    }> => {
      const request = getRequest()
      const user = await requerirParticipanteIngresado(request.headers)

      const torneoActual = await obtenerTorneoActual()
      asegurarIniciado(torneoActual ?? { iniciadoEn: null, finalizadoEn: null })
      if (user.torneoId !== torneoActual?.id) {
        throw new Error('Tu cuenta no pertenece al torneo actual')
      }

      const problema = await obtenerUnaFila(
        db.select().from(problemas).where(eq(problemas.id, data.problemaId)),
      )
      if (!problema) throw new Error('Problema no encontrado')
      if (problema.torneoId !== user.torneoId) {
        throw new Error('Este problema no pertenece a tu torneo')
      }

      const filaLenguaje = await obtenerUnaFila(
        db
          .select()
          .from(problemaLenguajes)
          .where(
            and(
              eq(problemaLenguajes.problemaId, data.problemaId),
              eq(problemaLenguajes.lenguaje, data.lenguaje),
            ),
          ),
      )
      if (!filaLenguaje)
        throw new Error('Lenguaje no habilitado para este problema')

      const casos = await db
        .select()
        .from(casosPrueba)
        .where(eq(casosPrueba.problemaId, data.problemaId))

      try {
        const { resultados, veredicto } = await ejecutarCasosPrueba(
          data.lenguaje,
          data.codigo,
          {
            nombreFuncion: filaLenguaje.nombreFuncion,
            parametros: problema.parametros,
            tipoRetorno: problema.tipoRetorno,
          },
          casos.map((c) => ({
            argumentos: c.argumentos,
            salidaEsperada: c.salidaEsperada,
            visible: c.visible,
          })),
        )
        const resultadosPublicos = ocultarDetalleCasosNoVisibles(resultados)
        const ahora = new Date()

        await db
          .insert(corridas)
          .values({
            usuarioId: user.id,
            problemaId: data.problemaId,
            contador: 1,
            ultimoCodigo: data.codigo,
            ultimoLenguaje: data.lenguaje,
            ultimoVeredicto: veredicto,
            ultimosResultados: resultados,
            ultimaEjecucionEn: ahora,
          })
          .onDuplicateKeyUpdate({
            set: {
              contador: sql`${corridas.contador} + 1`,
              ultimoCodigo: data.codigo,
              ultimoLenguaje: data.lenguaje,
              ultimoVeredicto: veredicto,
              ultimosResultados: resultados,
              ultimaEjecucionEn: ahora,
            },
          })

        let resuelto: { duracionMinutos: number; puntos: number } | null = null
        if (veredicto === 'aceptado') {
          const filasEnvio = await db
            .select()
            .from(envios)
            .where(
              and(
                eq(envios.usuarioId, user.id),
                eq(envios.problemaId, data.problemaId),
              ),
            )
          // El envio solo se autocrea la primera vez que un Run da aceptado; si un admin lo revierte a 'pendiente', un Run aceptado posterior no lo vuelve a marcar 'completado'.
          if (filasEnvio.length === 0) {
            await db
              .insert(envios)
              .values({
                usuarioId: user.id,
                problemaId: data.problemaId,
                codigo: data.codigo,
                lenguaje: data.lenguaje,
                estado: veredicto,
                estadoProgreso: 'completado',
                resultados,
                creadoEn: ahora,
              })
              .onDuplicateKeyUpdate({ set: { usuarioId: sql`usuario_id` } })
            // Solo se avisa "recién resuelto" la primera vez que se crea el
            // envio en esta misma corrida, no en corridas posteriores sobre
            // un problema que ya estaba completado.
            resuelto = torneoActual?.iniciadoEn
              ? await calcularResueltoParaUsuario(
                  user.id,
                  problema,
                  torneoActual.iniciadoEn,
                )
              : null
          }
        }

        let hint: string | null = null
        if (user.categoria === 'invitado') {
          try {
            const filasCorrida = await db
              .select()
              .from(corridas)
              .where(
                and(
                  eq(corridas.usuarioId, user.id),
                  eq(corridas.problemaId, data.problemaId),
                ),
              )
            const contador =
              filasCorrida.length > 0 ? filasCorrida[0].contador : 1

            if (debeMostrarHint(contador)) {
              const salidaError =
                resultados.find((r) => r.visible && r.salidaError)
                  ?.salidaError ?? ''
              hint = await generarComentarioEnvio({
                tituloProblema: problema.titulo,
                descripcionProblema: problema.descripcion,
                codigo: data.codigo,
                veredicto,
                salidaError,
              })
            }
          } catch (err) {
            console.error('No se pudo generar el hint de Claude', err)
            hint = null
          }
        }

        return { resultados: resultadosPublicos, error: null, hint, resuelto }
      } catch (err) {
        // Se registra el detalle en el servidor pero no se devuelve al
        // participante: el mensaje crudo puede exponer internals de Judge0 o de
        // la base de datos.
        console.error('Fallo al ejecutar la corrida', err)
        return {
          resultados: [],
          error: 'No se pudo ejecutar el código. Intenta de nuevo.',
          hint: null,
          resuelto: null,
        }
      }
    },
  )
