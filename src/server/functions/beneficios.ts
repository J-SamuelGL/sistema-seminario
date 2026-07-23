import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { obtenerUnaFila } from '../db/uno'
import { beneficios } from '../db/schema'
import { requerirAdmin, requerirUsuario } from '../auth/middleware'
import {
  registrarUsoBeneficioSchema,
  aplicarUsoBeneficio,
} from '../beneficios/registrar'

export const registrarUsoBeneficio = createServerFn({ method: 'POST' })
  .validator(registrarUsoBeneficioSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)
    await aplicarUsoBeneficio(data)
  })

export const obtenerBeneficioPropio = createServerFn({
  method: 'GET',
}).handler(async () => {
  const request = getRequest()
  const user = await requerirUsuario(request.headers)
  const beneficio = await obtenerUnaFila(
    db.select().from(beneficios).where(eq(beneficios.usuarioId, user.id)),
  )
  if (!beneficio) return null
  return { clave: beneficio.clave, usadoEn: beneficio.usadoEn }
})
