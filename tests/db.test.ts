import { describe, it, expect } from 'vitest'
import { db } from '../src/server/db/client'
import { tournamentState } from '../src/server/db/schema'
import { eq } from 'drizzle-orm'

describe('database connection', () => {
  it('can insert and read tournament_state', async () => {
    await db
      .insert(tournamentState)
      .values({ id: 1 })
      .onConflictDoNothing()
    const rows = await db
      .select()
      .from(tournamentState)
      .where(eq(tournamentState.id, 1))
    expect(rows.length).toBe(1)
  })
})
