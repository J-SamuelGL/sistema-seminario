import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { envios, usuarios, problemas } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'

export const listarTodosLosEnvios = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  await requerirAdmin(request.headers)

  return db
    .select({
      id: envios.id,
      nombreUsuario: usuarios.name,
      tituloProblema: problemas.titulo,
      lenguaje: envios.lenguaje,
      estado: envios.estado,
      creadoEn: envios.creadoEn,
    })
    .from(envios)
    .innerJoin(usuarios, eq(envios.usuarioId, usuarios.id))
    .innerJoin(problemas, eq(envios.problemaId, problemas.id))
    .orderBy(desc(envios.creadoEn))
    .limit(100)
})
