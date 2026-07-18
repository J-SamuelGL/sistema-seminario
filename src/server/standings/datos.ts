import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios, envios, problemas, estadoTorneo } from '../db/schema'
import { calcularClasificacion } from './calculate'
import type {
  RegistroUsuario,
  RegistroEnvio,
  RegistroProblema,
} from './calculate'

export async function cargarDatosClasificacion() {
  const filasEstado = await db
    .select()
    .from(estadoTorneo)
    .where(eq(estadoTorneo.id, 1))
  const torneoIniciadoEn =
    filasEstado.length > 0 ? filasEstado[0].iniciadoEn : null

  const [todosUsuarios, todosEnvios, todosProblemas] = await Promise.all([
    db.select().from(usuarios),
    db.select().from(envios),
    db.select().from(problemas),
  ])

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
