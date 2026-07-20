import { describe, it, expect } from 'vitest'
import {
  asegurarNoIniciado,
  asegurarIniciado,
  asegurarFinalizado,
} from '../src/server/tournament/guard'

describe('asegurarNoIniciado', () => {
  it('does not throw when the tournament has not started', () => {
    expect(() => asegurarNoIniciado({ iniciadoEn: null })).not.toThrow()
  })

  it('throws when the tournament already started', () => {
    expect(() => asegurarNoIniciado({ iniciadoEn: new Date() })).toThrow(
      'El torneo ya comenzó',
    )
  })
})

describe('asegurarIniciado', () => {
  it('does not throw when the tournament has started', () => {
    expect(() => asegurarIniciado({ iniciadoEn: new Date() })).not.toThrow()
  })

  it('throws when the tournament has not started', () => {
    expect(() => asegurarIniciado({ iniciadoEn: null })).toThrow(
      'El torneo aún no ha comenzado',
    )
  })

  it('throws when the tournament already concluded', () => {
    expect(() =>
      asegurarIniciado({ iniciadoEn: new Date(), finalizadoEn: new Date() }),
    ).toThrow('El torneo ya concluyó')
  })
})

describe('asegurarFinalizado', () => {
  it('no lanza si el torneo concluyó', () => {
    expect(() =>
      asegurarFinalizado({ finalizadoEn: new Date() }),
    ).not.toThrow()
  })

  it('lanza si el torneo no ha concluido', () => {
    expect(() => asegurarFinalizado({ finalizadoEn: null })).toThrow(
      'El torneo actual debe concluir antes de crear uno nuevo',
    )
  })
})
