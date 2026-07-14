import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
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
    await db
      .update(users)
      .set({ aiQuestionsUsed: user.aiQuestionsUsed + 1 })
      .where(eq(users.id, user.id))

    return { answer, questionsRemaining: 2 - (user.aiQuestionsUsed + 1) }
  })
