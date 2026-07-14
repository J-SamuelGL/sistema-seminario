import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { users } from '../db/schema'
import { requireAdmin } from '../auth/middleware'
import { buildCheckinResult } from '../checkin/result'

export const checkinByToken = createServerFn({ method: 'POST' })
  .validator((token: string) => token)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requireAdmin(request.headers)

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.checkinToken, data))
    const user = rows.length > 0 ? rows[0] : null
    const result = buildCheckinResult(user)
    if (result.status === 'checked_in' && user) {
      await db
        .update(users)
        .set({ checkedInAt: new Date() })
        .where(eq(users.id, user.id))
    }
    return result
  })
