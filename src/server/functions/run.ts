import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { problems, testCases } from '../db/schema'
import { requireCheckedInParticipant } from '../auth/middleware'
import { runTestCases } from '../judge/runTestCases'
import type { CaseResult } from '../judge/verdict'

export const runCode = createServerFn({ method: 'POST' })
  .validator((input: { problemId: string; language: string; code: string }) => input)
  .handler(async ({ data }): Promise<{ results: CaseResult[]; error: string | null }> => {
    const request = getRequest()
    await requireCheckedInParticipant(request.headers)

    const rows = await db.select().from(problems).where(eq(problems.id, data.problemId))
    const problem = rows.length > 0 ? rows[0] : null
    if (!problem) throw new Error('Problem not found')
    const cases = await db.select().from(testCases).where(eq(testCases.problemId, data.problemId))

    try {
      const { results } = await runTestCases(
        data.language,
        data.code,
        cases.map((c) => ({ input: c.input, expectedOutput: c.expectedOutput })),
      )
      return { results, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { results: [], error: `No se pudo ejecutar el código. Intenta de nuevo. (${message})` }
    }
  })
