import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '../src/server/db/client'
import { torneos, usuarios, beneficios } from '../src/server/db/schema'
import { aplicarUsoBeneficio } from '../src/server/beneficios/registrar'
import type { Categoria } from '../src/shared/dominio'
import type { ClaveBeneficio } from '../src/shared/beneficios'

async function crearTorneoDePrueba(): Promise<string> {
  const torneoId = crypto.randomUUID()
  await db.insert(torneos).values({
    id: torneoId,
    anio: 20000 + Math.floor(Math.random() * 1000),
  })
  return torneoId
}

async function crearUsuarioDePrueba(
  torneoId: string,
  categoria: Categoria,
): Promise<string> {
  const id = crypto.randomUUID()
  await db.insert(usuarios).values({
    id,
    name: 'Test',
    email: `${id}@example.com`,
    categoria,
    torneoId,
  })
  return id
}

async function crearBeneficio(
  usuarioId: string,
  clave: ClaveBeneficio,
): Promise<void> {
  await db.insert(beneficios).values({ usuarioId, clave })
}

describe('aplicarUsoBeneficio', () => {
  it('marca como usada una ventaja sin objetivo (ninguno)', async () => {
    const torneoId = await crearTorneoDePrueba()
    const usuarioId = await crearUsuarioDePrueba(torneoId, 'invitado')
    await crearBeneficio(usuarioId, 'busqueda_google')

    await aplicarUsoBeneficio({ usuarioId })

    const [fila] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, usuarioId))
    expect(fila.usadoEn).not.toBeNull()
  })

  it('rechaza objetivo cuando el beneficio no lo admite', async () => {
    const torneoId = await crearTorneoDePrueba()
    const usuarioId = await crearUsuarioDePrueba(torneoId, 'invitado')
    const otroId = await crearUsuarioDePrueba(torneoId, 'invitado')
    await crearBeneficio(usuarioId, 'nada')

    await expect(
      aplicarUsoBeneficio({ usuarioId, objetivoUsuarioId: otroId }),
    ).rejects.toThrow('Este beneficio no admite objetivo')
  })

  it('exige objetivo participante para una desventaja', async () => {
    const torneoId = await crearTorneoDePrueba()
    const usuarioId = await crearUsuarioDePrueba(torneoId, 'senior')
    await crearBeneficio(usuarioId, 'reiniciar_compu')

    await expect(aplicarUsoBeneficio({ usuarioId })).rejects.toThrow(
      'Debes seleccionar un participante objetivo',
    )
  })

  it('rechaza que el objetivo sea el mismo participante', async () => {
    const torneoId = await crearTorneoDePrueba()
    const usuarioId = await crearUsuarioDePrueba(torneoId, 'senior')
    await crearBeneficio(usuarioId, 'reiniciar_compu')

    await expect(
      aplicarUsoBeneficio({ usuarioId, objetivoUsuarioId: usuarioId }),
    ).rejects.toThrow('El objetivo no puede ser el mismo participante')
  })

  it('registra objetivo ingeniero para consultar_ingeniero', async () => {
    const torneoId = await crearTorneoDePrueba()
    const usuarioId = await crearUsuarioDePrueba(torneoId, 'invitado')
    await crearBeneficio(usuarioId, 'consultar_ingeniero')

    await aplicarUsoBeneficio({ usuarioId, objetivoIngeniero: 'Ingeniero 1' })

    const [fila] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, usuarioId))
    expect(fila.objetivoIngeniero).toBe('Ingeniero 1')
    expect(fila.usadoEn).not.toBeNull()
  })

  it('impide que un participante sea objetivo de una segunda desventaja', async () => {
    const torneoId = await crearTorneoDePrueba()
    const senior1 = await crearUsuarioDePrueba(torneoId, 'senior')
    const senior2 = await crearUsuarioDePrueba(torneoId, 'senior')
    const objetivo = await crearUsuarioDePrueba(torneoId, 'junior')
    await crearBeneficio(senior1, 'reiniciar_compu')
    await crearBeneficio(senior2, 'voltear_pantalla')

    await aplicarUsoBeneficio({
      usuarioId: senior1,
      objetivoUsuarioId: objetivo,
    })

    await expect(
      aplicarUsoBeneficio({ usuarioId: senior2, objetivoUsuarioId: objetivo }),
    ).rejects.toThrow('Ese participante ya fue objetivo de otra desventaja')
  })

  it('permite corregir el mismo registro sin chocar con la regla de no-repeticion', async () => {
    const torneoId = await crearTorneoDePrueba()
    const senior1 = await crearUsuarioDePrueba(torneoId, 'senior')
    const objetivoA = await crearUsuarioDePrueba(torneoId, 'junior')
    const objetivoB = await crearUsuarioDePrueba(torneoId, 'junior')
    await crearBeneficio(senior1, 'reiniciar_compu')

    await aplicarUsoBeneficio({
      usuarioId: senior1,
      objetivoUsuarioId: objetivoA,
    })
    await aplicarUsoBeneficio({
      usuarioId: senior1,
      objetivoUsuarioId: objetivoB,
    })

    const [fila] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, senior1))
    expect(fila.objetivoUsuarioId).toBe(objetivoB)
  })

  it('un objetivo de ventaja (ver_codigo) no cuenta para la regla de desventajas', async () => {
    const torneoId = await crearTorneoDePrueba()
    const invitado = await crearUsuarioDePrueba(torneoId, 'invitado')
    const senior = await crearUsuarioDePrueba(torneoId, 'senior')
    const objetivo = await crearUsuarioDePrueba(torneoId, 'junior')
    await crearBeneficio(invitado, 'ver_codigo')
    await crearBeneficio(senior, 'reiniciar_compu')

    await aplicarUsoBeneficio({
      usuarioId: invitado,
      objetivoUsuarioId: objetivo,
    })
    await aplicarUsoBeneficio({
      usuarioId: senior,
      objetivoUsuarioId: objetivo,
    })

    const [fila] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, senior))
    expect(fila.objetivoUsuarioId).toBe(objetivo)
  })
})
