import { auth } from './auth'

export async function getSessionUser(headers: Headers) {
  const session = await auth.api.getSession({ headers })
  return session?.user ?? null
}

export async function requireUser(headers: Headers) {
  const user = await getSessionUser(headers)
  if (!user) throw new Error('UNAUTHORIZED')
  return user
}

export async function requireAdmin(headers: Headers) {
  const user = await requireUser(headers)
  if (user.role !== 'admin') throw new Error('FORBIDDEN')
  return user
}

export async function requireCheckedInParticipant(headers: Headers) {
  const user = await requireUser(headers)
  if (!user.checkedInAt) throw new Error('NOT_CHECKED_IN')
  return user
}
