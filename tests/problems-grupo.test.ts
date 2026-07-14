import { describe, it, expect } from 'vitest'
import { grupoDeCategoria } from '../src/server/problems/grupo'

describe('grupoDeCategoria', () => {
  it('invitado y junior comparten el grupo invitado_junior', () => {
    expect(grupoDeCategoria('invitado')).toBe('invitado_junior')
    expect(grupoDeCategoria('junior')).toBe('invitado_junior')
  })

  it('senior tiene su propio grupo', () => {
    expect(grupoDeCategoria('senior')).toBe('senior')
  })
})
