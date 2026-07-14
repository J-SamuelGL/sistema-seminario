import { describe, it, expect } from 'vitest'
import { auth } from '../src/server/auth/auth'

describe('configuración de Better Auth', () => {
  it('habilita login por correo y contraseña, sin autoregistro público', () => {
    expect(auth.options.emailAndPassword?.enabled).toBe(true)
    expect(auth.options.emailAndPassword?.disableSignUp).toBe(true)
  })

  it('no configura proveedores OAuth', () => {
    expect(auth.options.socialProviders).toBeUndefined()
  })
})
