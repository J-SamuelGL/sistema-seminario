import { describe, it, expect } from 'vitest'
import { assertNotStarted, assertStarted } from '../src/server/tournament/guard'

describe('assertNotStarted', () => {
  it('does not throw when the tournament has not started', () => {
    expect(() => assertNotStarted({ startedAt: null })).not.toThrow()
  })

  it('throws when the tournament already started', () => {
    expect(() => assertNotStarted({ startedAt: new Date() })).toThrow('El torneo ya comenzó')
  })
})

describe('assertStarted', () => {
  it('does not throw when the tournament has started', () => {
    expect(() => assertStarted({ startedAt: new Date() })).not.toThrow()
  })

  it('throws when the tournament has not started', () => {
    expect(() => assertStarted({ startedAt: null })).toThrow('El torneo aún no ha comenzado')
  })
})
