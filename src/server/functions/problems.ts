import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { obtenerUnaFila } from '../db/uno'
import { problemas, casosPrueba, problemaLenguajes } from '../db/schema'
import {
  requerirAdmin,
  requerirParticipanteIngresado,
} from '../auth/middleware'
import {
  validarDatosProblema,
  datosProblemaSchema,
  datosProblemaConIdSchema,
} from '../problems/validate'
import { grupoDeCategoria } from '../problems/grupo'
import { idSchema } from '../validacion/comun'
import { calcularResueltoParaUsuario } from '../envios/resuelto'
import {
  obtenerTorneoActual,
  obtenerTorneoPorId,
  asegurarEsTorneoActual,
} from '../tournament/actual'

export const listarProblemas = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const user = await requerirParticipanteIngresado(request.headers)

    if (user.rol === 'admin') {
      const torneo = await obtenerTorneoActual()
      if (!torneo) return []
      return db
        .select()
        .from(problemas)
        .where(eq(problemas.torneoId, torneo.id))
        .orderBy(problemas.orden)
    }

    if (!user.torneoId) return []
    const torneo = await obtenerTorneoPorId(user.torneoId)
    if (!torneo?.iniciadoEn) return []

    const grupo = grupoDeCategoria(
      user.categoria as 'invitado' | 'junior' | 'senior',
    )
    return db
      .select()
      .from(problemas)
      .where(
        and(eq(problemas.grupo, grupo), eq(problemas.torneoId, user.torneoId)),
      )
      .orderBy(problemas.orden)
  },
)

export const obtenerProblema = createServerFn({ method: 'GET' })
  .validator(idSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const user = await requerirParticipanteIngresado(request.headers)
    const filaProblema = await obtenerUnaFila(
      db.select().from(problemas).where(eq(problemas.id, data)),
    )

    let torneoIniciadoEn: Date | null = null
    if (user.rol !== 'admin' && user.torneoId) {
      const torneo = await obtenerTorneoPorId(user.torneoId)
      torneoIniciadoEn = torneo?.iniciadoEn ?? null
    }

    const puedeVerlo =
      user.rol === 'admin' ||
      (filaProblema?.torneoId === user.torneoId &&
        filaProblema?.grupo ===
          grupoDeCategoria(user.categoria as 'invitado' | 'junior' | 'senior') &&
        Boolean(torneoIniciadoEn))
    const problema = filaProblema && puedeVerlo ? filaProblema : null
    const casosCompletos = problema
      ? await db
          .select()
          .from(casosPrueba)
          .where(eq(casosPrueba.problemaId, data))
      : []
    const casos =
      user.rol === 'admin'
        ? casosCompletos
        : casosCompletos.filter((c) => c.visible)
    const lenguajes = problema
      ? await db
          .select()
          .from(problemaLenguajes)
          .where(eq(problemaLenguajes.problemaId, data))
      : []
    const resuelto =
      problema && user.rol !== 'admin' && torneoIniciadoEn
        ? await calcularResueltoParaUsuario(user.id, problema, torneoIniciadoEn)
        : null
    return { problema, casosPrueba: casos, lenguajes, resuelto }
  })

export const crearProblema = createServerFn({ method: 'POST' })
  .validator(datosProblemaSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const errores = validarDatosProblema(data)
    if (errores.length > 0) throw new Error(errores.join(', '))

    const torneo = await obtenerTorneoActual()
    if (!torneo) throw new Error('No hay ningún torneo actual')

    const id = crypto.randomUUID()
    await db.insert(problemas).values({
      id,
      torneoId: torneo.id,
      titulo: data.titulo,
      descripcion: data.descripcion,
      dificultad: data.dificultad,
      categoriaProblema: data.categoriaProblema,
      orden: data.orden,
      grupo: data.grupo,
      puntos: data.puntos,
      parametros: data.parametros,
      tipoRetorno: data.tipoRetorno,
    })

    if (data.lenguajes.length > 0) {
      await db.insert(problemaLenguajes).values(
        data.lenguajes.map((l) => ({
          problemaId: id,
          lenguaje: l.lenguaje,
          nombreFuncion: l.nombreFuncion,
          codigoInicial: l.codigoInicial,
        })),
      )
    }

    if (data.casosPrueba.length > 0) {
      await db.insert(casosPrueba).values(
        data.casosPrueba.map((cp) => ({
          problemaId: id,
          argumentos: cp.argumentos,
          salidaEsperada: cp.salidaEsperada,
          visible: cp.visible,
        })),
      )
    }

    return { id, ...data }
  })

export const actualizarProblema = createServerFn({ method: 'POST' })
  .validator(datosProblemaConIdSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const errores = validarDatosProblema(data)
    if (errores.length > 0) throw new Error(errores.join(', '))

    const problemaExistente = await obtenerUnaFila(
      db.select().from(problemas).where(eq(problemas.id, data.id)),
    )
    if (!problemaExistente) throw new Error('Problema no encontrado')
    const torneoActual = await obtenerTorneoActual()
    asegurarEsTorneoActual(problemaExistente.torneoId ?? '', torneoActual)

    await db
      .update(problemas)
      .set({
        titulo: data.titulo,
        descripcion: data.descripcion,
        dificultad: data.dificultad,
        categoriaProblema: data.categoriaProblema,
        orden: data.orden,
        grupo: data.grupo,
        puntos: data.puntos,
        parametros: data.parametros,
        tipoRetorno: data.tipoRetorno,
      })
      .where(eq(problemas.id, data.id))

    await db
      .delete(problemaLenguajes)
      .where(eq(problemaLenguajes.problemaId, data.id))
    if (data.lenguajes.length > 0) {
      await db.insert(problemaLenguajes).values(
        data.lenguajes.map((l) => ({
          problemaId: data.id,
          lenguaje: l.lenguaje,
          nombreFuncion: l.nombreFuncion,
          codigoInicial: l.codigoInicial,
        })),
      )
    }

    await db.delete(casosPrueba).where(eq(casosPrueba.problemaId, data.id))
    if (data.casosPrueba.length > 0) {
      await db.insert(casosPrueba).values(
        data.casosPrueba.map((cp) => ({
          problemaId: data.id,
          argumentos: cp.argumentos,
          salidaEsperada: cp.salidaEsperada,
          visible: cp.visible,
        })),
      )
    }
  })

export const eliminarProblema = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const problemaExistente = await obtenerUnaFila(
      db.select().from(problemas).where(eq(problemas.id, data)),
    )
    if (!problemaExistente) throw new Error('Problema no encontrado')
    const torneoActual = await obtenerTorneoActual()
    asegurarEsTorneoActual(problemaExistente.torneoId ?? '', torneoActual)

    await db.delete(problemas).where(eq(problemas.id, data))
  })
