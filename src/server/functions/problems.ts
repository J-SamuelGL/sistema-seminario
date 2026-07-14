import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { problems, testCases } from '../db/schema'
import { requireAdmin, requireCheckedInParticipant } from '../auth/middleware'
import { validateProblemInput } from '../problems/validate'

type ProblemInput = {
  title: string
  description: string
  difficulty: string
  allowedLanguages: string[]
  sortOrder: number
  testCases: { input: string; expectedOutput: string }[]
}

export const listProblems = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  await requireCheckedInParticipant(request.headers)
  return db.select().from(problems).orderBy(problems.sortOrder)
})

export const getProblem = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requireCheckedInParticipant(request.headers)
    const rows = await db.select().from(problems).where(eq(problems.id, data))
    const problem = rows.length > 0 ? rows[0] : null
    const cases = await db.select().from(testCases).where(eq(testCases.problemId, data))
    return { problem, testCases: cases }
  })

export const createProblem = createServerFn({ method: 'POST' })
  .validator((input: ProblemInput) => input)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requireAdmin(request.headers)

    const errors = validateProblemInput(data)
    if (errors.length > 0) throw new Error(errors.join(', '))

    const [problem] = await db
      .insert(problems)
      .values({
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        allowedLanguages: data.allowedLanguages,
        sortOrder: data.sortOrder,
      })
      .returning()

    if (data.testCases.length > 0) {
      await db.insert(testCases).values(
        data.testCases.map((tc) => ({
          problemId: problem.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
        })),
      )
    }

    return problem
  })

export const updateProblem = createServerFn({ method: 'POST' })
  .validator((input: ProblemInput & { id: string }) => input)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requireAdmin(request.headers)

    const errors = validateProblemInput(data)
    if (errors.length > 0) throw new Error(errors.join(', '))

    await db
      .update(problems)
      .set({
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        allowedLanguages: data.allowedLanguages,
        sortOrder: data.sortOrder,
      })
      .where(eq(problems.id, data.id))

    await db.delete(testCases).where(eq(testCases.problemId, data.id))
    if (data.testCases.length > 0) {
      await db.insert(testCases).values(
        data.testCases.map((tc) => ({
          problemId: data.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
        })),
      )
    }
  })

export const deleteProblem = createServerFn({ method: 'POST' })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requireAdmin(request.headers)
    await db.delete(problems).where(eq(problems.id, data))
  })
