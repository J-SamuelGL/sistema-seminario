import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
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

export const listarProblemas = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const user = await requerirParticipanteIngresado(request.headers)
    if (user.rol === 'admin') {
      return db.select().from(problemas).orderBy(problemas.orden)
    }
    const grupo = grupoDeCategoria(
      user.categoria as 'invitado' | 'junior' | 'senior',
    )
    return db
      .select()
      .from(problemas)
      .where(eq(problemas.grupo, grupo))
      .orderBy(problemas.orden)
  },
)

export const obtenerProblema = createServerFn({ method: 'GET' })
  .validator(idSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const user = await requerirParticipanteIngresado(request.headers)
    const rows = await db.select().from(problemas).where(eq(problemas.id, data))
    const filaProblema = rows.length > 0 ? rows[0] : null
    const puedeVerlo =
      user.rol === 'admin' ||
      filaProblema?.grupo ===
        grupoDeCategoria(user.categoria as 'invitado' | 'junior' | 'senior')
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
    return { problema, casosPrueba: casos, lenguajes }
  })

export const crearProblema = createServerFn({ method: 'POST' })
  .validator(datosProblemaSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const errores = validarDatosProblema(data)
    if (errores.length > 0) throw new Error(errores.join(', '))

    const id = crypto.randomUUID()
    await db.insert(problemas).values({
      id,
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
    await db.delete(problemas).where(eq(problemas.id, data))
  })
