import { auth } from './auth'

export async function obtenerUsuarioSesion(headers: Headers) {
  const session = await auth.api.getSession({ headers })
  return session?.user ?? null
}

export async function requerirUsuario(headers: Headers) {
  const user = await obtenerUsuarioSesion(headers)
  if (!user) throw new Error('UNAUTHORIZED')
  return user
}

export async function requerirAdmin(headers: Headers) {
  const user = await requerirUsuario(headers)
  if (user.rol !== 'admin') throw new Error('FORBIDDEN')
  return user
}

export async function requerirParticipanteIngresado(headers: Headers) {
  const user = await requerirUsuario(headers)
  if (!user.ingresadoEn) throw new Error('NOT_CHECKED_IN')
  return user
}
