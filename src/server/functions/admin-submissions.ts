import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { envios, usuarios, problemas } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import { aplicarAprobacionManual, revertirAprobacionEnvio } from '../envios/aprobacion'
import { idSchema } from '../validacion/comun'

export const listarTodosLosEnvios = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  await requerirAdmin(request.headers)

  return db
    .select({
      id: envios.id,
      nombreUsuario: usuarios.name,
      tituloProblema: problemas.titulo,
      lenguaje: envios.lenguaje,
      estado: envios.estado,
      creadoEn: envios.creadoEn,
    })
    .from(envios)
    .innerJoin(usuarios, eq(envios.usuarioId, usuarios.id))
    .innerJoin(problemas, eq(envios.problemaId, problemas.id))
    .orderBy(desc(envios.creadoEn))
    .limit(100)
})

export const obtenerDetalleEnvio = createServerFn({ method: 'GET' })
  .validator(idSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const filas = await db
      .select({
        id: envios.id,
        codigo: envios.codigo,
        lenguaje: envios.lenguaje,
        estado: envios.estado,
        resultados: envios.resultados,
        veredictoOriginal: envios.veredictoOriginal,
        comentarioClaude: envios.comentarioClaude,
        aprobadoEn: envios.aprobadoEn,
        creadoEn: envios.creadoEn,
        nombreUsuario: usuarios.name,
        tituloProblema: problemas.titulo,
      })
      .from(envios)
      .innerJoin(usuarios, eq(envios.usuarioId, usuarios.id))
      .innerJoin(problemas, eq(envios.problemaId, problemas.id))
      .where(eq(envios.id, data))

    return filas.length > 0 ? filas[0] : null
  })

export const aprobarEnvioManualmente = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const admin = await requerirAdmin(request.headers)

    const filas = await db.select().from(envios).where(eq(envios.id, data))
    const envio = filas.length > 0 ? filas[0] : null
    if (!envio) throw new Error('Envío no encontrado')

    const campos = aplicarAprobacionManual(
      { estado: envio.estado, veredictoOriginal: envio.veredictoOriginal },
      admin.id,
      new Date(),
    )
    await db.update(envios).set(campos).where(eq(envios.id, data))
  })

export const revertirAprobacion = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const filas = await db.select().from(envios).where(eq(envios.id, data))
    const envio = filas.length > 0 ? filas[0] : null
    if (!envio) throw new Error('Envío no encontrado')

    const campos = revertirAprobacionEnvio({ veredictoOriginal: envio.veredictoOriginal })
    await db.update(envios).set(campos).where(eq(envios.id, data))
  })
