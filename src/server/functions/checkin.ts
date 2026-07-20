import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { obtenerUnaFila } from '../db/uno'
import { usuarios } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import { construirResultadoIngreso } from '../checkin/result'
import { tokenIngresoSchema } from '../checkin/validar'
import { cerrarTodasLasSesiones } from '../sesiones/activas'

export const registrarIngresoPorToken = createServerFn({ method: 'POST' })
  .validator(tokenIngresoSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const user = await obtenerUnaFila(
      db.select().from(usuarios).where(eq(usuarios.tokenIngreso, data)),
    )
    const resultado = construirResultadoIngreso(user)
    if (resultado.status === 'ingresado' && user) {
      await db
        .update(usuarios)
        .set({ ingresadoEn: new Date() })
        .where(eq(usuarios.id, user.id))
      // Cualquier sesión abierta antes del check-in (p. ej. alguien logeado
      // en casa con estas credenciales) muere aquí: el participante inicia
      // sesión estando ya presente en el evento, y a partir de ahí el hook
      // de sesión única en auth.ts mantiene la exclusividad.
      await cerrarTodasLasSesiones(user.id)
    }
    return resultado
  })
