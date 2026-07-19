import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import type { auth } from '#/server/auth/auth'

// `inferAdditionalFields<typeof auth>()` es solo un import de tipos (better-auth
// lo usa para tipar el cliente, no ejecuta nada del módulo servidor) — le da a
// `authClient` los campos custom del usuario (p. ej. `rol`), evitando casts como
// `data.user as { rol?: string }` en los call sites.
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
})
