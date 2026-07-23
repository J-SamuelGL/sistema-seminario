import { describe, it, expect } from 'vitest'
import { db } from '../src/server/db/client'
import {
  torneos,
  usuarios,
  problemas,
  envios,
  corridas,
} from '../src/server/db/schema'
import { cargarEstadisticasProblemas } from '../src/server/standings/estadisticasProblemasDatos'

describe('cargarEstadisticasProblemas', () => {
  it('agrega estadísticas por problema solo del torneo dado', async () => {
    const torneoId = crypto.randomUUID()
    await db.insert(torneos).values({
      id: torneoId,
      anio: 1400 + Math.floor(Math.random() * 100),
    })

    const usuarioA = crypto.randomUUID()
    const usuarioB = crypto.randomUUID()
    await db.insert(usuarios).values([
      {
        id: usuarioA,
        name: 'A',
        email: `a-${usuarioA}@example.com`,
        categoria: 'invitado',
        torneoId,
      },
      {
        id: usuarioB,
        name: 'B',
        email: `b-${usuarioB}@example.com`,
        categoria: 'invitado',
        torneoId,
      },
    ])

    const problemaId = crypto.randomUUID()
    await db.insert(problemas).values({
      id: problemaId,
      titulo: 'Suma',
      descripcion: 'd',
      dificultad: 'Fácil',
      grupo: 'invitado_junior',
      puntos: 10,
      parametros: [],
      tipoRetorno: 'int',
      torneoId,
    })

    await db.insert(envios).values({
      usuarioId: usuarioA,
      problemaId,
      codigo: 'c',
      lenguaje: 'python',
      estadoProgreso: 'completado',
    })
    await db.insert(corridas).values([
      { usuarioId: usuarioA, problemaId, contador: 2 },
      { usuarioId: usuarioB, problemaId, contador: 3 },
    ])

    const resultado = await cargarEstadisticasProblemas(torneoId)
    const stat = resultado.todas.find((s) => s.problemaId === problemaId)
    expect(stat).toMatchObject({
      elegibles: 2,
      resueltos: 1,
      intentosTotales: 5,
    })
    expect(resultado.resueltosPorNadie).toEqual([])
  })
})
