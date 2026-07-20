import { eq, inArray } from 'drizzle-orm'
import { db } from '../db/client'
import { obtenerUnaFila } from '../db/uno'
import { usuarios, envios, problemas, torneos } from '../db/schema'
import { calcularClasificacion } from './calculate'
import type {
  RegistroUsuario,
  RegistroEnvio,
  RegistroProblema,
} from './calculate'

export async function cargarDatosClasificacion(torneoId: string) {
  const [torneo, todosUsuarios, todosProblemas] = await Promise.all([
    obtenerUnaFila(db.select().from(torneos).where(eq(torneos.id, torneoId))),
    db.select().from(usuarios).where(eq(usuarios.torneoId, torneoId)),
    db.select().from(problemas).where(eq(problemas.torneoId, torneoId)),
  ])
  const torneoIniciadoEn = torneo?.iniciadoEn ?? null

  const idsUsuarios = todosUsuarios.map((u) => u.id)
  const todosEnvios =
    idsUsuarios.length > 0
      ? await db
          .select()
          .from(envios)
          .where(inArray(envios.usuarioId, idsUsuarios))
      : []

  const usuariosElegibles: RegistroUsuario[] = todosUsuarios
    .filter((u) => u.rol === 'participante')
    .map((u) => ({ id: u.id, nombre: u.name, categoria: u.categoria }))

  const registrosEnvios: RegistroEnvio[] = todosEnvios.map((e) => ({
    usuarioId: e.usuarioId,
    problemaId: e.problemaId,
    estadoProgreso: e.estadoProgreso,
    creadoEn: e.creadoEn,
  }))

  const registrosProblemas: RegistroProblema[] = todosProblemas.map((p) => ({
    id: p.id,
    puntos: p.puntos,
  }))

  const clasificacion = calcularClasificacion(
    usuariosElegibles,
    registrosEnvios,
    registrosProblemas,
    torneoIniciadoEn ?? new Date(),
  )

  return { clasificacion, todosUsuarios, todosProblemas, torneoIniciadoEn }
}
