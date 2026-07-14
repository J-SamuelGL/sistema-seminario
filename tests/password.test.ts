import { describe, it, expect } from 'vitest'
import { generarContrasenaAleatoria } from '../src/server/auth/password'

describe('generarContrasenaAleatoria', () => {
  it('genera una contraseña de 12 caracteres', () => {
    expect(generarContrasenaAleatoria()).toHaveLength(12)
  })

  it('solo usa caracteres seguros para URL/correo', () => {
    expect(generarContrasenaAleatoria()).toMatch(/^[A-Za-z0-9_-]{12}$/)
  })

  it('genera contraseñas distintas en llamadas distintas', () => {
    expect(generarContrasenaAleatoria()).not.toBe(generarContrasenaAleatoria())
  })
})
