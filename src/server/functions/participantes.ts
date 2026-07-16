import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, sql } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { db } from '../db/client'
import { usuarios, cuentas, envios } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import { crearCuentaParticipante } from '../participantes/crear'
import { generarContrasenaAleatoria } from '../auth/password'
import { enviarCorreoBienvenida } from '../email/brevo'

type DatosParticipante = {
  nombre: string
  correo: string
  categoria: 'invitado' | 'junior' | 'senior'
  carnet: string | null
}

export const registrarParticipante = createServerFn({ method: 'POST' })
  .validator((input: DatosParticipante) => input)
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
  .validator((usuarioId: string) => usuarioId)
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
      .where(and(eq(cuentas.userId, data), eq(cuentas.providerId, 'credential')))

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

export const obtenerParticipantes = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  await requerirAdmin(request.headers)

  const filas = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.name,
      correo: usuarios.email,
      categoria: usuarios.categoria,
      carnet: usuarios.carnet,
      ingresadoEn: usuarios.ingresadoEn,
      cantidadEnvios: sql<number>`count(${envios.id})`,
    })
    .from(usuarios)
    .leftJoin(envios, eq(envios.usuarioId, usuarios.id))
    .where(eq(usuarios.rol, 'participante'))
    .groupBy(usuarios.id)

  return filas.map((f) => ({ ...f, cantidadEnvios: Number(f.cantidadEnvios) }))
})
