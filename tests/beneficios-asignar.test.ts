import { describe, it, expect, vi, afterEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '../src/server/db/client'
import { torneos, usuarios, beneficios } from '../src/server/db/schema'
import { asignarBeneficios } from '../src/server/beneficios/asignar'
import { CLAVES_VENTAJA, CLAVES_DESVENTAJA } from '../src/shared/beneficios'
import type { Categoria } from '../src/shared/dominio'

async function crearTorneoDePrueba(): Promise<string> {
  const torneoId = crypto.randomUUID()
  await db.insert(torneos).values({
    id: torneoId,
    anio: 9000 + Math.floor(Math.random() * 1000),
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

describe('asignarBeneficios', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('asigna una ventaja a invitado/junior y una desventaja a senior', async () => {
    const torneoId = await crearTorneoDePrueba()
    const invitadoId = await crearUsuarioDePrueba(torneoId, 'invitado')
    const juniorId = await crearUsuarioDePrueba(torneoId, 'junior')
    const seniorId = await crearUsuarioDePrueba(torneoId, 'senior')

    await asignarBeneficios(torneoId)

    const [filaInvitado] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, invitadoId))
    expect((CLAVES_VENTAJA as readonly string[]).includes(filaInvitado.clave)).toBe(
      true,
    )

    const [filaJunior] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, juniorId))
    expect((CLAVES_VENTAJA as readonly string[]).includes(filaJunior.clave)).toBe(
      true,
    )

    const [filaSenior] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, seniorId))
    expect(
      (CLAVES_DESVENTAJA as readonly string[]).includes(filaSenior.clave),
    ).toBe(true)
  })

  it('elige el primer elemento del pool cuando Math.random devuelve 0', async () => {
    const torneoId = await crearTorneoDePrueba()
    const seniorId = await crearUsuarioDePrueba(torneoId, 'senior')

    vi.spyOn(Math, 'random').mockReturnValue(0)
    await asignarBeneficios(torneoId)

    const [fila] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, seniorId))
    expect(fila.clave).toBe(CLAVES_DESVENTAJA[0])
  })

  it('no reasigna a quien ya tiene beneficio', async () => {
    const torneoId = await crearTorneoDePrueba()
    const usuarioId = await crearUsuarioDePrueba(torneoId, 'invitado')

    await asignarBeneficios(torneoId)
    const [primeraAsignacion] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, usuarioId))

    await asignarBeneficios(torneoId)
    const filasFinal = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, usuarioId))

    expect(filasFinal.length).toBe(1)
    expect(filasFinal[0].clave).toBe(primeraAsignacion.clave)
  })
})
