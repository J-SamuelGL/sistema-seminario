import { describe, it, expect } from 'vitest'
import { db } from '../src/server/db/client'
import { torneos, usuarios, problemas, envios } from '../src/server/db/schema'
import { cargarDatosClasificacion } from '../src/server/standings/datos'

describe('cargarDatosClasificacion', () => {
  it('solo incluye usuarios, problemas y envios del torneo dado', async () => {
    const torneoA = crypto.randomUUID()
    const torneoB = crypto.randomUUID()
    const iniciadoEn = new Date('2026-01-01T00:00:00Z')
    await db.insert(torneos).values([
      { id: torneoA, anio: 1100 + Math.floor(Math.random() * 100), iniciadoEn },
      { id: torneoB, anio: 1300 + Math.floor(Math.random() * 100) },
    ])

    const usuarioA = crypto.randomUUID()
    const usuarioB = crypto.randomUUID()
    await db.insert(usuarios).values([
      {
        id: usuarioA,
        name: 'A',
        email: `a-${usuarioA}@example.com`,
        categoria: 'senior',
        torneoId: torneoA,
      },
      {
        id: usuarioB,
        name: 'B',
        email: `b-${usuarioB}@example.com`,
        categoria: 'senior',
        torneoId: torneoB,
      },
    ])

    const problemaA = crypto.randomUUID()
    const problemaB = crypto.randomUUID()
    await db.insert(problemas).values([
      {
        id: problemaA,
        titulo: 'PA',
        descripcion: 'd',
        dificultad: 'Fácil',
        grupo: 'senior',
        puntos: 10,
        parametros: [],
        tipoRetorno: 'int',
        torneoId: torneoA,
      },
      {
        id: problemaB,
        titulo: 'PB',
        descripcion: 'd',
        dificultad: 'Fácil',
        grupo: 'senior',
        puntos: 10,
        parametros: [],
        tipoRetorno: 'int',
        torneoId: torneoB,
      },
    ])

    await db.insert(envios).values([
      {
        usuarioId: usuarioA,
        problemaId: problemaA,
        codigo: 'c',
        lenguaje: 'python',
        estadoProgreso: 'completado',
      },
      {
        usuarioId: usuarioB,
        problemaId: problemaB,
        codigo: 'c',
        lenguaje: 'python',
        estadoProgreso: 'completado',
      },
    ])

    const datos = await cargarDatosClasificacion(torneoA)
    expect(datos.todosUsuarios.map((u) => u.id)).toEqual([usuarioA])
    expect(datos.todosProblemas.map((p) => p.id)).toEqual([problemaA])
    expect(datos.clasificacion.map((c) => c.usuarioId)).toEqual([usuarioA])
    expect(datos.torneoIniciadoEn).toEqual(iniciadoEn)
  })
})
