import { createAuthClient } from 'better-auth/react'
import { useNavigate } from '@tanstack/react-router'

const authClient = createAuthClient()

export function useCerrarSesion() {
  const navigate = useNavigate()
  return async function cerrarSesion() {
    await authClient.signOut()
    await navigate({ to: '/' })
  }
}
