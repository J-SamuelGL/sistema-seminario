import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios } from '../db/schema'
import { requerirUsuario } from '../auth/middleware'
import { asegurarCategoriaNoDefinida } from '../auth/category'

export const establecerCategoria = createServerFn({ method: 'POST' })
  .validator((categoria: 'senior' | 'junior') => categoria)
  .handler(async ({ data }) => {
    const request = getRequest()
    const user = await requerirUsuario(request.headers)
    asegurarCategoriaNoDefinida(user)
    await db.update(usuarios).set({ categoria: data }).where(eq(usuarios.id, user.id))
    return { categoria: data }
  })

export const obtenerUsuarioActual = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  return requerirUsuario(request.headers)
})
