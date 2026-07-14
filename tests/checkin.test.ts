import { describe, it, expect } from 'vitest'
import { buildCheckinResult } from '../src/server/checkin/result'

describe('buildCheckinResult', () => {
  it('returns not_found when no user matches the token', () => {
    expect(buildCheckinResult(null)).toEqual({ status: 'not_found' })
  })

  it('returns checked_in for a user checking in for the first time', () => {
    expect(buildCheckinResult({ name: 'Ana', checkedInAt: null })).toEqual({
      status: 'checked_in',
      userName: 'Ana',
    })
  })

  it('returns already_checked_in for a user who already checked in', () => {
    expect(
      buildCheckinResult({ name: 'Ana', checkedInAt: new Date() }),
    ).toEqual({
      status: 'already_checked_in',
      userName: 'Ana',
    })
  })
})
