import { describe, it, expect } from 'vitest'
import { construirCorreoBienvenida } from '../src/server/email/brevo'

describe('construirCorreoBienvenida', () => {
  it('incluye el nombre, el correo como destinatario, y la contraseña en el cuerpo', () => {
    const correo = construirCorreoBienvenida({
      nombre: 'Ana Pérez',
      correo: 'ana@example.com',
      contrasena: 'abc123XYZ456',
    })
    expect(correo.to).toEqual([{ email: 'ana@example.com', name: 'Ana Pérez' }])
    expect(correo.htmlContent).toContain('Ana Pérez')
    expect(correo.htmlContent).toContain('ana@example.com')
    expect(correo.htmlContent).toContain('abc123XYZ456')
  })

  it('usa el remitente configurado por variable de entorno', () => {
    process.env.BREVO_CORREO_REMITENTE = 'torneo@example.com'
    const correo = construirCorreoBienvenida({
      nombre: 'Ana',
      correo: 'ana@example.com',
      contrasena: 'x',
    })
    expect(correo.sender.email).toBe('torneo@example.com')
  })
})
