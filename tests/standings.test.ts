import { describe, it, expect } from 'vitest'
import { calcularClasificacion, agruparClasificacionPorCategoria } from '../src/server/standings/calculate'

const start = new Date('2026-07-13T10:00:00Z')

describe('calcularClasificacion', () => {
  it('returns zero solved for a user with no submissions', () => {
    const filas = calcularClasificacion(
      [{ id: 'u1', nombre: 'Ana', categoria: 'senior' }],
      [],
      start,
    )
    expect(filas).toEqual([
      { usuarioId: 'u1', nombre: 'Ana', categoria: 'senior', cantidadResueltos: 0, minutosPenalizacionTotal: 0 },
    ])
  })

  it('counts an accepted submission as solved with time-based penalty', () => {
    const filas = calcularClasificacion(
      [{ id: 'u1', nombre: 'Ana', categoria: 'senior' }],
      [
        {
          usuarioId: 'u1',
          problemaId: 'p1',
          estado: 'aceptado',
          creadoEn: new Date('2026-07-13T10:10:00Z'),
        },
      ],
      start,
    )
    expect(filas[0].cantidadResueltos).toBe(1)
    expect(filas[0].minutosPenalizacionTotal).toBe(10)
  })

  it('adds 20 minutes penalty per failed attempt before the accepted one', () => {
    const filas = calcularClasificacion(
      [{ id: 'u1', nombre: 'Ana', categoria: 'senior' }],
      [
        { usuarioId: 'u1', problemaId: 'p1', estado: 'respuesta_incorrecta', creadoEn: new Date('2026-07-13T10:02:00Z') },
        { usuarioId: 'u1', problemaId: 'p1', estado: 'respuesta_incorrecta', creadoEn: new Date('2026-07-13T10:05:00Z') },
        { usuarioId: 'u1', problemaId: 'p1', estado: 'aceptado', creadoEn: new Date('2026-07-13T10:10:00Z') },
      ],
      start,
    )
    expect(filas[0].cantidadResueltos).toBe(1)
    expect(filas[0].minutosPenalizacionTotal).toBe(10 + 20 * 2)
  })

  it('does not count a problem with no accepted submission as solved', () => {
    const filas = calcularClasificacion(
      [{ id: 'u1', nombre: 'Ana', categoria: 'senior' }],
      [{ usuarioId: 'u1', problemaId: 'p1', estado: 'respuesta_incorrecta', creadoEn: new Date('2026-07-13T10:05:00Z') }],
      start,
    )
    expect(filas[0].cantidadResueltos).toBe(0)
    expect(filas[0].minutosPenalizacionTotal).toBe(0)
  })

  it('sorts by solved count desc, then penalty asc', () => {
    const filas = calcularClasificacion(
      [
        { id: 'u1', nombre: 'Ana', categoria: 'senior' },
        { id: 'u2', nombre: 'Beto', categoria: 'senior' },
      ],
      [
        { usuarioId: 'u1', problemaId: 'p1', estado: 'aceptado', creadoEn: new Date('2026-07-13T10:30:00Z') },
        { usuarioId: 'u2', problemaId: 'p1', estado: 'aceptado', creadoEn: new Date('2026-07-13T10:05:00Z') },
        { usuarioId: 'u2', problemaId: 'p2', estado: 'aceptado', creadoEn: new Date('2026-07-13T10:20:00Z') },
      ],
      start,
    )
    expect(filas.map((f) => f.usuarioId)).toEqual(['u2', 'u1'])
  })

  it('ignores pending submissions', () => {
    const filas = calcularClasificacion(
      [{ id: 'u1', nombre: 'Ana', categoria: 'junior' }],
      [{ usuarioId: 'u1', problemaId: 'p1', estado: 'pendiente', creadoEn: new Date('2026-07-13T10:05:00Z') }],
      start,
    )
    expect(filas[0].cantidadResueltos).toBe(0)
  })
})

describe('agruparClasificacionPorCategoria', () => {
  it('separa las filas en invitado, junior y senior', () => {
    const agrupado = agruparClasificacionPorCategoria([
      { usuarioId: 'u1', nombre: 'Ana', categoria: 'senior', cantidadResueltos: 1, minutosPenalizacionTotal: 5 },
      { usuarioId: 'u2', nombre: 'Beto', categoria: 'junior', cantidadResueltos: 0, minutosPenalizacionTotal: 0 },
      { usuarioId: 'u3', nombre: 'Cata', categoria: 'invitado', cantidadResueltos: 0, minutosPenalizacionTotal: 0 },
    ])
    expect(agrupado.senior.map((f) => f.usuarioId)).toEqual(['u1'])
    expect(agrupado.junior.map((f) => f.usuarioId)).toEqual(['u2'])
    expect(agrupado.invitado.map((f) => f.usuarioId)).toEqual(['u3'])
  })
})
