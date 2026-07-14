import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { tournamentState } from '../db/schema'
import { requireAdmin } from '../auth/middleware'
import { assertNotStarted } from '../tournament/guard'

export const getTournamentState = createServerFn({ method: 'GET' }).handler(async () => {
  const rows = await db.select().from(tournamentState).where(eq(tournamentState.id, 1))
  const state = rows.length > 0 ? rows[0] : null
  return state ?? { id: 1, startedAt: null }
})

export const startTournament = createServerFn({ method: 'POST' }).handler(async () => {
  const request = getRequest()
  await requireAdmin(request.headers)

  const rows = await db.select().from(tournamentState).where(eq(tournamentState.id, 1))
  const existing = rows.length > 0 ? rows[0] : null
  assertNotStarted(existing ?? { startedAt: null })

  const startedAt = new Date()
  await db
    .insert(tournamentState)
    .values({ id: 1, startedAt })
    .onConflictDoUpdate({ target: tournamentState.id, set: { startedAt } })

  return { startedAt }
})
