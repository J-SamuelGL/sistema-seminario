import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { problemas, casosPrueba } from '../db/schema'
import { requerirAdmin, requerirParticipanteIngresado } from '../auth/middleware'
import { validarDatosProblema } from '../problems/validate'

type DatosProblema = {
  titulo: string
  descripcion: string
  dificultad: string
  lenguajesPermitidos: string[]
  orden: number
  casosPrueba: { entrada: string; salidaEsperada: string }[]
}

export const listarProblemas = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  await requerirParticipanteIngresado(request.headers)
  return db.select().from(problemas).orderBy(problemas.orden)
})

export const obtenerProblema = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirParticipanteIngresado(request.headers)
    const rows = await db.select().from(problemas).where(eq(problemas.id, data))
    const problema = rows.length > 0 ? rows[0] : null
    const casos = await db.select().from(casosPrueba).where(eq(casosPrueba.problemaId, data))
    return { problema, casosPrueba: casos }
  })

export const crearProblema = createServerFn({ method: 'POST' })
  .validator((input: DatosProblema) => input)
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
      lenguajesPermitidos: data.lenguajesPermitidos,
      orden: data.orden,
    })

    if (data.casosPrueba.length > 0) {
      await db.insert(casosPrueba).values(
        data.casosPrueba.map((cp) => ({
          problemaId: id,
          entrada: cp.entrada,
          salidaEsperada: cp.salidaEsperada,
        })),
      )
    }

    return { id, ...data }
  })

export const actualizarProblema = createServerFn({ method: 'POST' })
  .validator((input: DatosProblema & { id: string }) => input)
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
        lenguajesPermitidos: data.lenguajesPermitidos,
        orden: data.orden,
      })
      .where(eq(problemas.id, data.id))

    await db.delete(casosPrueba).where(eq(casosPrueba.problemaId, data.id))
    if (data.casosPrueba.length > 0) {
      await db.insert(casosPrueba).values(
        data.casosPrueba.map((cp) => ({
          problemaId: data.id,
          entrada: cp.entrada,
          salidaEsperada: cp.salidaEsperada,
        })),
      )
    }
  })

export const eliminarProblema = createServerFn({ method: 'POST' })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)
    await db.delete(problemas).where(eq(problemas.id, data))
  })
