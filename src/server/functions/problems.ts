import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import {
  problemas,
  casosPrueba,
  problemaLenguajes,
  estadoTorneo,
  envios,
} from '../db/schema'
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
import { calcularDuraciones } from '../standings/duracion'

async function obtenerEstadoTorneoRow() {
  const filas = await db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))
  return filas.length > 0 ? filas[0] : null
}

export const listarProblemas = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const user = await requerirParticipanteIngresado(request.headers)
    if (user.rol === 'admin') {
      return db.select().from(problemas).orderBy(problemas.orden)
    }
    const estado = await obtenerEstadoTorneoRow()
    if (!estado?.iniciadoEn) return []
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
    const estado = await obtenerEstadoTorneoRow()
    const puedeVerlo =
      user.rol === 'admin' ||
      (filaProblema?.grupo ===
        grupoDeCategoria(user.categoria as 'invitado' | 'junior' | 'senior') &&
        Boolean(estado?.iniciadoEn))
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
      problema && user.rol !== 'admin' && estado?.iniciadoEn
        ? await calcularResueltoParaUsuario(user.id, problema, estado.iniciadoEn)
        : null
    return { problema, casosPrueba: casos, lenguajes, resuelto }
  })

async function calcularResueltoParaUsuario(
  usuarioId: string,
  problema: typeof problemas.$inferSelect,
  torneoIniciadoEn: Date,
) {
  const enviosDelUsuario = await db
    .select()
    .from(envios)
    .where(eq(envios.usuarioId, usuarioId))
  const envioDeEsteProblema = enviosDelUsuario.find(
    (e) => e.problemaId === problema.id,
  )
  if (!envioDeEsteProblema || envioDeEsteProblema.estadoProgreso === 'pendiente')
    return null

  const resueltos = enviosDelUsuario
    .filter((e) => e.estadoProgreso !== 'pendiente')
    .map((e) => ({ problemaId: e.problemaId, creadoEn: e.creadoEn }))
  const duraciones = calcularDuraciones(resueltos, torneoIniciadoEn)
  const duracionMinutos =
    duraciones.find((d) => d.problemaId === problema.id)?.duracionMinutos ?? 0

  return {
    duracionMinutos,
    puntos: problema.puntos,
    codigo: envioDeEsteProblema.codigo,
    lenguaje: envioDeEsteProblema.lenguaje,
  }
}

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
