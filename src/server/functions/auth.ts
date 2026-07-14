import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { users } from '../db/schema'
import { requireUser } from '../auth/middleware'
import { assertCategoryNotSet } from '../auth/category'

export const setCategory = createServerFn({ method: 'POST' })
  .validator((category: 'senior' | 'junior') => category)
  .handler(async ({ data }) => {
    const request = getRequest()
    const user = await requireUser(request.headers)
    assertCategoryNotSet(user)
    await db.update(users).set({ category: data }).where(eq(users.id, user.id))
    return { category: data }
  })

export const getMe = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  return requireUser(request.headers)
})
