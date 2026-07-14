import { createServerFn } from '@tanstack/react-start'
import { eq, isNotNull } from 'drizzle-orm'
import { db } from '../db/client'
import { users, submissions, tournamentState } from '../db/schema'
import { calculateStandings, groupStandingsByCategory } from '../standings/calculate'
import type { UserRecord } from '../standings/calculate'

export const getStandings = createServerFn({ method: 'GET' }).handler(async () => {
  const stateRows = await db.select().from(tournamentState).where(eq(tournamentState.id, 1))
  const state = stateRows.length > 0 ? stateRows[0] : null
  if (!state?.startedAt) {
    return { started: false as const, senior: [], junior: [] }
  }

  const allUsers = await db.select().from(users).where(isNotNull(users.category))
  const allSubmissions = await db.select().from(submissions)

  const eligibleUsers: Array<UserRecord> = allUsers
    .filter((u): u is typeof u & { category: 'senior' | 'junior' } => u.category !== null)
    .map((u) => ({ id: u.id, name: u.name, category: u.category }))

  const rows = calculateStandings(
    eligibleUsers,
    allSubmissions.map((s) => ({
      userId: s.userId,
      problemId: s.problemId,
      status: s.status,
      createdAt: s.createdAt,
    })),
    state.startedAt,
  )
  const grouped = groupStandingsByCategory(rows)
  return { started: true as const, ...grouped }
})
