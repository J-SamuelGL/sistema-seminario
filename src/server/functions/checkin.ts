import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import { construirResultadoIngreso } from '../checkin/result'
import { tokenIngresoSchema } from '../checkin/validar'

export const registrarIngresoPorToken = createServerFn({ method: 'POST' })
  .validator(tokenIngresoSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const rows = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.tokenIngreso, data))
    const user = rows.length > 0 ? rows[0] : null
    const resultado = construirResultadoIngreso(user)
    if (resultado.status === 'ingresado' && user) {
      await db
        .update(usuarios)
        .set({ ingresadoEn: new Date() })
        .where(eq(usuarios.id, user.id))
    }
    return resultado
  })
