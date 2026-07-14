import { describe, it, expect } from 'vitest'
import { construirResultadoIngreso } from '../src/server/checkin/result'

describe('construirResultadoIngreso', () => {
  it('returns not_found when no user matches the token', () => {
    expect(construirResultadoIngreso(null)).toEqual({ status: 'no_encontrado' })
  })

  it('returns checked_in for a user checking in for the first time', () => {
    expect(construirResultadoIngreso({ name: 'Ana', ingresadoEn: null })).toEqual({
      status: 'ingresado',
      nombreUsuario: 'Ana',
    })
  })

  it('returns already_checked_in for a user who already checked in', () => {
    expect(
      construirResultadoIngreso({ name: 'Ana', ingresadoEn: new Date() }),
    ).toEqual({
      status: 'ya_ingresado',
      nombreUsuario: 'Ana',
    })
  })
})
