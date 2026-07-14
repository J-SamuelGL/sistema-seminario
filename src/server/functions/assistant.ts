import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, lt, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { problems, aiQuestions, users } from '../db/schema'
import { requireCheckedInParticipant } from '../auth/middleware'
import { canAskQuestion } from '../assistant/limit'
import { answerJuniorQuestion } from '../claude/assistant'

export const askAssistant = createServerFn({ method: 'POST' })
  .validator((input: { problemId: string; question: string }) => input)
  .handler(async ({ data }) => {
    const request = getRequest()
    const user = await requireCheckedInParticipant(request.headers)

    if (
      !user.category ||
      !canAskQuestion({
        category: user.category,
        aiQuestionsUsed: user.aiQuestionsUsed,
      })
    ) {
      throw new Error('AI_LIMIT_REACHED')
    }

    // Atomically reserve a question slot before calling Claude, so two
    // concurrent requests can't both observe aiQuestionsUsed < 2 and both
    // proceed. The WHERE clause is checked against the current DB row, not
    // the stale in-memory `user` value, closing the race window.
    const reserved = await db
      .update(users)
      .set({ aiQuestionsUsed: sql`${users.aiQuestionsUsed} + 1` })
      .where(and(eq(users.id, user.id), lt(users.aiQuestionsUsed, 2)))
      .returning()
    const reservedUser = reserved.length > 0 ? reserved[0] : null
    if (!reservedUser) throw new Error('AI_LIMIT_REACHED')

    const problemRows = await db
      .select()
      .from(problems)
      .where(eq(problems.id, data.problemId))
    const problem = problemRows.length > 0 ? problemRows[0] : null
    if (!problem) throw new Error('Problem not found')

    const answer = await answerJuniorQuestion({
      problemDescription: problem.description,
      question: data.question,
    })

    await db.insert(aiQuestions).values({
      userId: user.id,
      problemId: data.problemId,
      question: data.question,
      answer,
    })

    return { answer, questionsRemaining: 2 - reservedUser.aiQuestionsUsed }
  })
