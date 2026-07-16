import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import { crearCuentaParticipante } from '../participantes/crear'
import { enviarCorreoBienvenida } from '../email/brevo'

export const obtenerAdministradores = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  await requerirAdmin(request.headers)
  return db
    .select({ id: usuarios.id, nombre: usuarios.name, correo: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.rol, 'admin'))
})

export const registrarAdministrador = createServerFn({ method: 'POST' })
  .validator((input: { nombre: string; correo: string }) => input)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const { id, contrasenaGenerada } = await crearCuentaParticipante({
      nombre: data.nombre,
      correo: data.correo,
      categoria: 'senior',
      carnet: null,
      rol: 'admin',
    })

    let correoEnviado = true
    try {
      await enviarCorreoBienvenida({ nombre: data.nombre, correo: data.correo, contrasena: contrasenaGenerada })
    } catch (err) {
      console.error('No se pudo enviar el correo de bienvenida', err)
      correoEnviado = false
    }

    return { id, nombre: data.nombre, correo: data.correo, correoEnviado, contrasenaGenerada }
  })

export const eliminarAdministrador = createServerFn({ method: 'POST' })
  .validator((usuarioId: string) => usuarioId)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const filas = await db.select().from(usuarios).where(eq(usuarios.id, data))
    const usuario = filas.length > 0 ? filas[0] : null
    if (!usuario) throw new Error('Administrador no encontrado')
    if (usuario.rol !== 'admin') throw new Error('Esta cuenta no es de administrador')

    await db.delete(usuarios).where(eq(usuarios.id, data))
  })
