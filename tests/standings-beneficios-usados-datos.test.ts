import { describe, it, expect } from 'vitest'
import { db } from '../src/server/db/client'
import { torneos, usuarios, beneficios } from '../src/server/db/schema'
import {
  cargarBeneficiosUsados,
  cargarCupoIaRestante,
} from '../src/server/standings/beneficiosUsadosDatos'

describe('cargarBeneficiosUsados', () => {
  it('incluye el nombre del objetivo cuando el beneficio ya se usó', async () => {
    const torneoId = crypto.randomUUID()
    await db.insert(torneos).values({ id: torneoId, anio: 1700 + Math.floor(Math.random() * 100) })

    const usuarioId = crypto.randomUUID()
    const objetivoId = crypto.randomUUID()
    await db.insert(usuarios).values([
      {
        id: usuarioId,
        name: 'Ana',
        email: `a-${usuarioId}@example.com`,
        categoria: 'senior',
        torneoId,
      },
      {
        id: objetivoId,
        name: 'Beto',
        email: `b-${objetivoId}@example.com`,
        categoria: 'senior',
        torneoId,
      },
    ])

    await db.insert(beneficios).values({
      usuarioId,
      clave: 'salir_caminar',
      usadoEn: new Date('2026-07-23T10:00:00Z'),
      objetivoUsuarioId: objetivoId,
    })

    const resultado = await cargarBeneficiosUsados(torneoId)
    expect(resultado).toEqual([
      expect.objectContaining({
        usuarioId,
        usuarioNombre: 'Ana',
        clave: 'salir_caminar',
        objetivoUsuarioNombre: 'Beto',
      }),
    ])
  })
})

describe('cargarCupoIaRestante', () => {
  it('calcula el cupo restante solo para participantes invitado', async () => {
    const torneoId = crypto.randomUUID()
    await db.insert(torneos).values({ id: torneoId, anio: 1900 + Math.floor(Math.random() * 100) })

    const invitadoId = crypto.randomUUID()
    const seniorId = crypto.randomUUID()
    await db.insert(usuarios).values([
      {
        id: invitadoId,
        name: 'Invitada',
        email: `i-${invitadoId}@example.com`,
        categoria: 'invitado',
        torneoId,
        preguntasIaUsadas: 1,
      },
      {
        id: seniorId,
        name: 'Senior',
        email: `s-${seniorId}@example.com`,
        categoria: 'senior',
        torneoId,
        preguntasIaUsadas: 1,
      },
    ])

    const resultado = await cargarCupoIaRestante(torneoId)
    expect(resultado).toEqual([
      { usuarioId: invitadoId, usuarioNombre: 'Invitada', preguntasRestantes: 2 },
    ])
  })
})
