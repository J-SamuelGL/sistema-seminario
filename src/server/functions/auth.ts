import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { requerirUsuario, obtenerUsuarioSesion } from '../auth/middleware'

export const obtenerUsuarioActual = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    return requerirUsuario(request.headers)
  },
)

export const obtenerUsuarioActualOpcional = createServerFn({
  method: 'GET',
}).handler(async () => {
  const request = getRequest()
  return obtenerUsuarioSesion(request.headers)
})
