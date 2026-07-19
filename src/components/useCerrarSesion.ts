import { useNavigate } from '@tanstack/react-router'
import { authClient } from '#/components/authClient'

export function useCerrarSesion() {
  const navigate = useNavigate()
  return async function cerrarSesion() {
    await authClient.signOut()
    await navigate({ to: '/' })
  }
}
