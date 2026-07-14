import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { submissions, users, problems } from '../db/schema'
import { requireAdmin } from '../auth/middleware'

export const listAllSubmissions = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  await requireAdmin(request.headers)

  return db
    .select({
      id: submissions.id,
      userName: users.name,
      problemTitle: problems.title,
      language: submissions.language,
      status: submissions.status,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .innerJoin(users, eq(submissions.userId, users.id))
    .innerJoin(problems, eq(submissions.problemId, problems.id))
    .orderBy(desc(submissions.createdAt))
    .limit(100)
})
