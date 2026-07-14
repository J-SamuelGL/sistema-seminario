import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../db/client'
import * as schema from '../db/schema'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'participant', input: false },
      category: { type: 'string', required: false, input: false },
      checkinToken: { type: 'string', input: false },
      checkedInAt: { type: 'date', required: false, input: false },
      aiQuestionsUsed: { type: 'number', defaultValue: 0, input: false },
    },
  },
})

export type SessionUser =
  Awaited<ReturnType<typeof auth.api.getSession>> extends infer S
    ? S extends { user: infer U }
      ? U
      : never
    : never
