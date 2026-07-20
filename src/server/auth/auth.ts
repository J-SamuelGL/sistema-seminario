import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import * as schema from '../db/schema'
import { cerrarOtrasSesiones } from '../sesiones/activas'

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
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  databaseHooks: {
    session: {
      create: {
        // Sesión única por participante: cada login elimina las demás
        // sesiones de la cuenta, para que nadie pueda resolver problemas en
        // paralelo desde otro dispositivo. Los admins quedan exentos —
        // necesitan varias a la vez (p. ej. teléfono para escanear QR de
        // check-in + laptop para el panel).
        after: async (sesion) => {
          const [usuario] = await db
            .select({ rol: schema.usuarios.rol })
            .from(schema.usuarios)
            .where(eq(schema.usuarios.id, sesion.userId))
          if (usuario.rol === 'admin') return
          await cerrarOtrasSesiones(sesion.userId, sesion.id)
        },
      },
    },
  },
  user: {
    additionalFields: {
      rol: { type: 'string', defaultValue: 'participante', input: false },
      categoria: { type: 'string', required: true, input: false },
      carnet: { type: 'string', required: false, input: false },
      torneoId: { type: 'string', required: false, input: false },
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
