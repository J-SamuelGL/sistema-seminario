import { describe, it, expect } from 'vitest'
import { db } from '../src/server/db/client'
import { torneos, usuarios, problemas, envios } from '../src/server/db/schema'
import { cargarActividadReciente } from '../src/server/standings/actividadRecienteDatos'

describe('cargarActividadReciente', () => {
  it('devuelve solo envíos resueltos del torneo dado, más recientes primero', async () => {
    const torneoId = crypto.randomUUID()
    const otroTorneoId = crypto.randomUUID()
    await db.insert(torneos).values([
      { id: torneoId, anio: 1600 + Math.floor(Math.random() * 100) },
      { id: otroTorneoId, anio: 1800 + Math.floor(Math.random() * 100) },
    ])

    const usuarioId = crypto.randomUUID()
    const usuarioOtroTorneo = crypto.randomUUID()
    await db.insert(usuarios).values([
      {
        id: usuarioId,
        name: 'Ana',
        email: `a-${usuarioId}@example.com`,
        categoria: 'invitado',
        torneoId,
      },
      {
        id: usuarioOtroTorneo,
        name: 'Beto',
        email: `b-${usuarioOtroTorneo}@example.com`,
        categoria: 'invitado',
        torneoId: otroTorneoId,
      },
    ])

    const problemaViejo = crypto.randomUUID()
    const problemaNuevo = crypto.randomUUID()
    const problemaPendiente = crypto.randomUUID()
    const problemaOtroTorneo = crypto.randomUUID()
    await db.insert(problemas).values([
      {
        id: problemaViejo,
        titulo: 'Viejo',
        descripcion: 'd',
        dificultad: 'Fácil',
        grupo: 'invitado_junior',
        puntos: 10,
        parametros: [],
        tipoRetorno: 'int',
        torneoId,
      },
      {
        id: problemaNuevo,
        titulo: 'Nuevo',
        descripcion: 'd',
        dificultad: 'Fácil',
        grupo: 'invitado_junior',
        puntos: 10,
        parametros: [],
        tipoRetorno: 'int',
        torneoId,
      },
      {
        id: problemaPendiente,
        titulo: 'Pendiente',
        descripcion: 'd',
        dificultad: 'Fácil',
        grupo: 'invitado_junior',
        puntos: 10,
        parametros: [],
        tipoRetorno: 'int',
        torneoId,
      },
      {
        id: problemaOtroTorneo,
        titulo: 'OtroTorneo',
        descripcion: 'd',
        dificultad: 'Fácil',
        grupo: 'invitado_junior',
        puntos: 10,
        parametros: [],
        tipoRetorno: 'int',
        torneoId: otroTorneoId,
      },
    ])

    await db.insert(envios).values([
      {
        usuarioId,
        problemaId: problemaViejo,
        codigo: 'c',
        lenguaje: 'python',
        estadoProgreso: 'completado',
        creadoEn: new Date('2026-07-23T10:00:00Z'),
      },
      {
        usuarioId,
        problemaId: problemaNuevo,
        codigo: 'c',
        lenguaje: 'python',
        estadoProgreso: 'aprobado_manual',
        creadoEn: new Date('2026-07-23T11:00:00Z'),
      },
      {
        usuarioId,
        problemaId: problemaPendiente,
        codigo: 'c',
        lenguaje: 'python',
        estadoProgreso: 'pendiente',
        creadoEn: new Date('2026-07-23T12:30:00Z'),
      },
      {
        usuarioId: usuarioOtroTorneo,
        problemaId: problemaOtroTorneo,
        codigo: 'c',
        lenguaje: 'python',
        estadoProgreso: 'completado',
        creadoEn: new Date('2026-07-23T12:00:00Z'),
      },
    ])

    const resultado = await cargarActividadReciente(torneoId, 15)
    expect(resultado.map((r) => r.problemaTitulo)).toEqual(['Nuevo', 'Viejo'])
    // Verify pendiente status is excluded: 'Pendiente' should NOT appear
    expect(resultado.map((r) => r.problemaTitulo)).not.toContain('Pendiente')
  })
})
