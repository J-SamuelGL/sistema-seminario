import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '../src/server/db/client'
import {
  torneos,
  usuarios,
  problemas,
  corridas,
  envios,
} from '../src/server/db/schema'
import { guardarProgresoPendiente } from '../src/server/tournament/progresoPendiente'

describe('guardarProgresoPendiente', () => {
  it('crea un envio pendiente por cada corrida sin envio, solo del torneo dado', async () => {
    const torneoId = crypto.randomUUID()
    await db.insert(torneos).values({
      id: torneoId,
      anio: 6000 + Math.floor(Math.random() * 1000),
    })
    const otroTorneoId = crypto.randomUUID()
    await db.insert(torneos).values({
      id: otroTorneoId,
      anio: 7000 + Math.floor(Math.random() * 1000),
    })

    const usuarioId = crypto.randomUUID()
    await db.insert(usuarios).values({
      id: usuarioId,
      name: 'Ana',
      email: `ana-${usuarioId}@example.com`,
      categoria: 'senior',
      torneoId,
    })
    const usuarioOtroTorneoId = crypto.randomUUID()
    await db.insert(usuarios).values({
      id: usuarioOtroTorneoId,
      name: 'Beto',
      email: `beto-${usuarioOtroTorneoId}@example.com`,
      categoria: 'senior',
      torneoId: otroTorneoId,
    })

    const problemaId = crypto.randomUUID()
    await db.insert(problemas).values({
      id: problemaId,
      titulo: 'P',
      descripcion: 'd',
      dificultad: 'Fácil',
      grupo: 'senior',
      puntos: 10,
      parametros: [],
      tipoRetorno: 'int',
      torneoId,
    })

    const ultimaEjecucionEn = new Date('2026-01-01T00:00:00Z')
    await db.insert(corridas).values({
      usuarioId,
      problemaId,
      contador: 1,
      ultimoCodigo: 'print(1)',
      ultimoLenguaje: 'python',
      ultimoVeredicto: 'respuesta_incorrecta',
      ultimaEjecucionEn,
    })
    await db.insert(corridas).values({
      usuarioId: usuarioOtroTorneoId,
      problemaId,
      contador: 1,
      ultimoCodigo: 'print(2)',
      ultimoLenguaje: 'python',
      ultimoVeredicto: 'respuesta_incorrecta',
      ultimaEjecucionEn,
    })

    await guardarProgresoPendiente(torneoId, new Date())

    const filas = await db
      .select()
      .from(envios)
      .where(eq(envios.usuarioId, usuarioId))
    expect(filas.length).toBe(1)
    expect(filas[0].estadoProgreso).toBe('pendiente')
    expect(filas[0].codigo).toBe('print(1)')

    const filasOtroTorneo = await db
      .select()
      .from(envios)
      .where(eq(envios.usuarioId, usuarioOtroTorneoId))
    expect(filasOtroTorneo.length).toBe(0)
  })
})
