import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { problems, testCases, submissions, tournamentState } from '../db/schema'
import { requireCheckedInParticipant } from '../auth/middleware'
import { runTestCases } from '../judge/runTestCases'
import { generateSubmissionFeedback } from '../claude/feedback'
import { assertStarted } from '../tournament/guard'

export const submitCode = createServerFn({ method: 'POST' })
  .validator((input: { problemId: string; language: string; code: string }) => input)
  .handler(async ({ data }): Promise<{ submissionId: string; verdict: string | null; error: string | null }> => {
    const request = getRequest()
    const user = await requireCheckedInParticipant(request.headers)

    const stateRows = await db.select().from(tournamentState).where(eq(tournamentState.id, 1))
    const state = stateRows.length > 0 ? stateRows[0] : null
    assertStarted(state ?? { startedAt: null })

    const problemRows = await db.select().from(problems).where(eq(problems.id, data.problemId))
    const problem = problemRows.length > 0 ? problemRows[0] : null
    if (!problem) throw new Error('Problem not found')
    const cases = await db.select().from(testCases).where(eq(testCases.problemId, data.problemId))

    const insertedRows = await db
      .insert(submissions)
      .values({
        userId: user.id,
        problemId: data.problemId,
        code: data.code,
        language: data.language,
        status: 'pending',
      })
      .returning()
    const submission = insertedRows.length > 0 ? insertedRows[0] : null
    if (!submission) throw new Error('Failed to create submission')

    try {
      const { results, verdict } = await runTestCases(
        data.language,
        data.code,
        cases.map((c) => ({ input: c.input, expectedOutput: c.expectedOutput })),
      )
      const stderr = results.find((r) => r.stderr)?.stderr ?? ''

      await db.update(submissions).set({ status: verdict }).where(eq(submissions.id, submission.id))

      generateSubmissionFeedback({
        problemTitle: problem.title,
        problemDescription: problem.description,
        code: data.code,
        verdict,
        stderr,
      })
        .then((feedback) =>
          db.update(submissions).set({ claudeFeedback: feedback }).where(eq(submissions.id, submission.id)),
        )
        .catch((err: unknown) => console.error('Claude feedback failed', err))

      return { submissionId: submission.id, verdict, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        submissionId: submission.id,
        verdict: null,
        error: `No se pudo evaluar el envío. Intenta de nuevo. (${message})`,
      }
    }
  })

export const getSubmission = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requireCheckedInParticipant(request.headers)
    const rows = await db.select().from(submissions).where(eq(submissions.id, data))
    return rows.length > 0 ? rows[0] : null
  })
