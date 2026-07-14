import { describe, it, expect } from 'vitest'
import { calculateStandings, groupStandingsByCategory } from '../src/server/standings/calculate'

const start = new Date('2026-07-13T10:00:00Z')

describe('calculateStandings', () => {
  it('returns zero solved for a user with no submissions', () => {
    const rows = calculateStandings(
      [{ id: 'u1', name: 'Ana', category: 'senior' }],
      [],
      start,
    )
    expect(rows).toEqual([
      { userId: 'u1', name: 'Ana', category: 'senior', solvedCount: 0, totalPenaltyMinutes: 0 },
    ])
  })

  it('counts an accepted submission as solved with time-based penalty', () => {
    const rows = calculateStandings(
      [{ id: 'u1', name: 'Ana', category: 'senior' }],
      [
        {
          userId: 'u1',
          problemId: 'p1',
          status: 'accepted',
          createdAt: new Date('2026-07-13T10:10:00Z'),
        },
      ],
      start,
    )
    expect(rows[0].solvedCount).toBe(1)
    expect(rows[0].totalPenaltyMinutes).toBe(10)
  })

  it('adds 20 minutes penalty per failed attempt before the accepted one', () => {
    const rows = calculateStandings(
      [{ id: 'u1', name: 'Ana', category: 'senior' }],
      [
        { userId: 'u1', problemId: 'p1', status: 'wrong_answer', createdAt: new Date('2026-07-13T10:02:00Z') },
        { userId: 'u1', problemId: 'p1', status: 'wrong_answer', createdAt: new Date('2026-07-13T10:05:00Z') },
        { userId: 'u1', problemId: 'p1', status: 'accepted', createdAt: new Date('2026-07-13T10:10:00Z') },
      ],
      start,
    )
    expect(rows[0].solvedCount).toBe(1)
    expect(rows[0].totalPenaltyMinutes).toBe(10 + 20 * 2)
  })

  it('does not count a problem with no accepted submission as solved', () => {
    const rows = calculateStandings(
      [{ id: 'u1', name: 'Ana', category: 'senior' }],
      [{ userId: 'u1', problemId: 'p1', status: 'wrong_answer', createdAt: new Date('2026-07-13T10:05:00Z') }],
      start,
    )
    expect(rows[0].solvedCount).toBe(0)
    expect(rows[0].totalPenaltyMinutes).toBe(0)
  })

  it('sorts by solved count desc, then penalty asc', () => {
    const rows = calculateStandings(
      [
        { id: 'u1', name: 'Ana', category: 'senior' },
        { id: 'u2', name: 'Beto', category: 'senior' },
      ],
      [
        { userId: 'u1', problemId: 'p1', status: 'accepted', createdAt: new Date('2026-07-13T10:30:00Z') },
        { userId: 'u2', problemId: 'p1', status: 'accepted', createdAt: new Date('2026-07-13T10:05:00Z') },
        { userId: 'u2', problemId: 'p2', status: 'accepted', createdAt: new Date('2026-07-13T10:20:00Z') },
      ],
      start,
    )
    expect(rows.map((r) => r.userId)).toEqual(['u2', 'u1'])
  })

  it('ignores pending submissions', () => {
    const rows = calculateStandings(
      [{ id: 'u1', name: 'Ana', category: 'junior' }],
      [{ userId: 'u1', problemId: 'p1', status: 'pending', createdAt: new Date('2026-07-13T10:05:00Z') }],
      start,
    )
    expect(rows[0].solvedCount).toBe(0)
  })
})

describe('groupStandingsByCategory', () => {
  it('splits rows into senior and junior lists', () => {
    const grouped = groupStandingsByCategory([
      { userId: 'u1', name: 'Ana', category: 'senior', solvedCount: 1, totalPenaltyMinutes: 5 },
      { userId: 'u2', name: 'Beto', category: 'junior', solvedCount: 0, totalPenaltyMinutes: 0 },
    ])
    expect(grouped.senior.map((r) => r.userId)).toEqual(['u1'])
    expect(grouped.junior.map((r) => r.userId)).toEqual(['u2'])
  })
})
