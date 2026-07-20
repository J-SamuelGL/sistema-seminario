import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '../auth/auth'
import { contarSesionesActivas, cerrarOtrasSesiones } from '../sesiones/activas'

export const contarMisSesionesActivas = createServerFn({
  method: 'GET',
}).handler(async () => {
  const request = getRequest()
  const sesion = await auth.api.getSession({ headers: request.headers })
  if (!sesion) throw new Error('UNAUTHORIZED')
  return { activas: await contarSesionesActivas(sesion.user.id) }
})

export const cerrarMisOtrasSesiones = createServerFn({
  method: 'POST',
}).handler(async () => {
  const request = getRequest()
  const sesion = await auth.api.getSession({ headers: request.headers })
  if (!sesion) throw new Error('UNAUTHORIZED')
  const cerradas = await cerrarOtrasSesiones(sesion.user.id, sesion.session.id)
  return { cerradas }
})
