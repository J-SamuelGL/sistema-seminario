import { describe, it, expect } from 'vitest'
import { assertNotStarted } from '../src/server/tournament/guard'

describe('assertNotStarted', () => {
  it('does not throw when the tournament has not started', () => {
    expect(() => assertNotStarted({ startedAt: null })).not.toThrow()
  })

  it('throws when the tournament already started', () => {
    expect(() => assertNotStarted({ startedAt: new Date() })).toThrow('El torneo ya comenzó')
  })
})
