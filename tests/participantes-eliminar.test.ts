import { describe, it, expect } from 'vitest'
import { puedeEliminarParticipante } from '../src/shared/participantes'

describe('puedeEliminarParticipante', () => {
  it('permite eliminar a un participante sin envíos', () => {
    expect(
      puedeEliminarParticipante({ rol: 'participante', cantidadEnvios: 0 }),
    ).toEqual({
      puede: true,
    })
  })

  it('bloquea eliminar a un participante con envíos', () => {
    const resultado = puedeEliminarParticipante({
      rol: 'participante',
      cantidadEnvios: 3,
    })
    expect(resultado.puede).toBe(false)
  })

  it('bloquea eliminar una cuenta que no es de participante', () => {
    const resultado = puedeEliminarParticipante({
      rol: 'admin',
      cantidadEnvios: 0,
    })
    expect(resultado.puede).toBe(false)
  })
})
