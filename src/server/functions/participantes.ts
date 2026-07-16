import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, sql } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { db } from '../db/client'
import { usuarios, cuentas, envios, preguntasIa } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import { crearCuentaParticipante } from '../participantes/crear'
import { generarContrasenaAleatoria } from '../auth/password'
import { enviarCorreoBienvenida } from '../email/brevo'
import { puedeEliminarParticipante } from '../participantes/eliminar'
import { datosParticipanteSchema } from '../participantes/validar'
import { idSchema } from '../validacion/comun'

export const registrarParticipante = createServerFn({ method: 'POST' })
  .validator(datosParticipanteSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const { id, contrasenaGenerada } = await crearCuentaParticipante(data)

    let correoEnviado = true
    try {
      await enviarCorreoBienvenida({
        nombre: data.nombre,
        correo: data.correo,
        contrasena: contrasenaGenerada,
      })
    } catch (err) {
      console.error('No se pudo enviar el correo de bienvenida', err)
      correoEnviado = false
    }

    return {
      id,
      nombre: data.nombre,
      correo: data.correo,
      categoria: data.categoria,
      correoEnviado,
      contrasenaGenerada,
    }
  })

export const reenviarCredenciales = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const filas = await db.select().from(usuarios).where(eq(usuarios.id, data))
    const usuario = filas.length > 0 ? filas[0] : null
    if (!usuario) throw new Error('Participante no encontrado')

    const contrasenaGenerada = generarContrasenaAleatoria()
    const hash = await hashPassword(contrasenaGenerada)
    await db
      .update(cuentas)
      .set({ password: hash })
      .where(
        and(eq(cuentas.userId, data), eq(cuentas.providerId, 'credential')),
      )

    let correoEnviado = true
    try {
      await enviarCorreoBienvenida({
        nombre: usuario.name,
        correo: usuario.email,
        contrasena: contrasenaGenerada,
      })
    } catch (err) {
      console.error('No se pudo enviar el correo de bienvenida', err)
      correoEnviado = false
    }

    return { correoEnviado, contrasenaGenerada }
  })

export const obtenerParticipantes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const filas = await db
      .select({
        id: usuarios.id,
        nombre: usuarios.name,
        correo: usuarios.email,
        categoria: usuarios.categoria,
        carnet: usuarios.carnet,
        semestre: usuarios.semestre,
        ingresadoEn: usuarios.ingresadoEn,
        cantidadEnvios: sql<number>`count(${envios.id})`,
      })
      .from(usuarios)
      .leftJoin(envios, eq(envios.usuarioId, usuarios.id))
      .where(eq(usuarios.rol, 'participante'))
      .groupBy(usuarios.id)

    return filas.map((f) => ({
      ...f,
      cantidadEnvios: Number(f.cantidadEnvios),
    }))
  },
)

export const eliminarParticipante = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const filas = await db.select().from(usuarios).where(eq(usuarios.id, data))
    const usuario = filas.length > 0 ? filas[0] : null
    if (!usuario) throw new Error('Participante no encontrado')

    const filasEnvios = await db
      .select()
      .from(envios)
      .where(eq(envios.usuarioId, data))
    const permiso = puedeEliminarParticipante({
      rol: usuario.rol,
      cantidadEnvios: filasEnvios.length,
    })
    if (!permiso.puede) throw new Error(permiso.motivo)

    await db.transaction(async (tx) => {
      await tx.delete(preguntasIa).where(eq(preguntasIa.usuarioId, data))
      await tx.delete(usuarios).where(eq(usuarios.id, data))
    })
  })
