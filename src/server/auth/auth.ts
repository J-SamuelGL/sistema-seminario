import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../db/client'
import * as schema from '../db/schema'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'mysql',
    schema: {
      user: schema.usuarios,
      session: schema.sesiones,
      account: schema.cuentas,
      verification: schema.verificaciones,
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
      rol: { type: 'string', defaultValue: 'participante', input: false },
      categoria: { type: 'string', required: false, input: false },
      tokenIngreso: { type: 'string', input: false },
      ingresadoEn: { type: 'date', required: false, input: false },
      preguntasIaUsadas: { type: 'number', defaultValue: 0, input: false },
    },
  },
})

export type SessionUser =
  Awaited<ReturnType<typeof auth.api.getSession>> extends infer S
    ? S extends { user: infer U }
      ? U
      : never
    : never
