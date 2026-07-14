import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { requerirUsuario } from '../auth/middleware'

export const obtenerUsuarioActual = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  return requerirUsuario(request.headers)
})
