import { describe, it, expect } from 'vitest'
import { calcularClasificacion, agruparClasificacionPorCategoria } from '../src/server/standings/calculate'

const start = new Date('2026-07-13T10:00:00Z')
const problemas = [
  { id: 'p1', puntos: 10 },
  { id: 'p2', puntos: 20 },
]

describe('calcularClasificacion', () => {
  it('returns zero solved and zero points for a user with no envios', () => {
    const filas = calcularClasificacion([{ id: 'u1', nombre: 'Ana', categoria: 'senior' }], [], problemas, start)
    expect(filas).toEqual([
      { usuarioId: 'u1', nombre: 'Ana', categoria: 'senior', cantidadResueltos: 0, puntosTotales: 0, minutosPenalizacionTotal: 0 },
    ])
  })

  it('counts a completado envio as solved, sums its points, and applies time penalty', () => {
    const filas = calcularClasificacion(
      [{ id: 'u1', nombre: 'Ana', categoria: 'senior' }],
      [{ usuarioId: 'u1', problemaId: 'p1', estadoProgreso: 'completado', creadoEn: new Date('2026-07-13T10:10:00Z') }],
      problemas,
      start,
    )
    expect(filas[0].cantidadResueltos).toBe(1)
    expect(filas[0].puntosTotales).toBe(10)
    expect(filas[0].minutosPenalizacionTotal).toBe(10)
  })

  it('counts an aprobado_manual envio the same as completado', () => {
    const filas = calcularClasificacion(
      [{ id: 'u1', nombre: 'Ana', categoria: 'senior' }],
      [{ usuarioId: 'u1', problemaId: 'p1', estadoProgreso: 'aprobado_manual', creadoEn: new Date('2026-07-13T10:20:00Z') }],
      problemas,
      start,
    )
    expect(filas[0].cantidadResueltos).toBe(1)
    expect(filas[0].puntosTotales).toBe(10)
    expect(filas[0].minutosPenalizacionTotal).toBe(20)
  })

  it('does not count a pendiente envio as solved', () => {
    const filas = calcularClasificacion(
      [{ id: 'u1', nombre: 'Ana', categoria: 'senior' }],
      [{ usuarioId: 'u1', problemaId: 'p1', estadoProgreso: 'pendiente', creadoEn: new Date('2026-07-13T10:05:00Z') }],
      problemas,
      start,
    )
    expect(filas[0].cantidadResueltos).toBe(0)
    expect(filas[0].puntosTotales).toBe(0)
  })

  it('sums multiple solved problems for the same user', () => {
    const filas = calcularClasificacion(
      [{ id: 'u1', nombre: 'Ana', categoria: 'senior' }],
      [
        { usuarioId: 'u1', problemaId: 'p1', estadoProgreso: 'completado', creadoEn: new Date('2026-07-13T10:10:00Z') },
        { usuarioId: 'u1', problemaId: 'p2', estadoProgreso: 'completado', creadoEn: new Date('2026-07-13T10:30:00Z') },
      ],
      problemas,
      start,
    )
    expect(filas[0].cantidadResueltos).toBe(2)
    expect(filas[0].puntosTotales).toBe(30)
    expect(filas[0].minutosPenalizacionTotal).toBe(10 + 30)
  })

  it('sorts by total points desc, then penalty asc — not by solved count', () => {
    const filas = calcularClasificacion(
      [
        { id: 'u1', nombre: 'Ana', categoria: 'senior' },
        { id: 'u2', nombre: 'Beto', categoria: 'senior' },
      ],
      [
        { usuarioId: 'u1', problemaId: 'p2', estadoProgreso: 'completado', creadoEn: new Date('2026-07-13T10:30:00Z') },
        { usuarioId: 'u2', problemaId: 'p1', estadoProgreso: 'completado', creadoEn: new Date('2026-07-13T10:05:00Z') },
      ],
      problemas,
      start,
    )
    expect(filas.map((f) => f.usuarioId)).toEqual(['u1', 'u2'])
  })
})

describe('agruparClasificacionPorCategoria', () => {
  it('separa las filas en invitado, junior y senior', () => {
    const agrupado = agruparClasificacionPorCategoria([
      { usuarioId: 'u1', nombre: 'Ana', categoria: 'senior', cantidadResueltos: 1, puntosTotales: 10, minutosPenalizacionTotal: 5 },
      { usuarioId: 'u2', nombre: 'Beto', categoria: 'junior', cantidadResueltos: 0, puntosTotales: 0, minutosPenalizacionTotal: 0 },
      { usuarioId: 'u3', nombre: 'Cata', categoria: 'invitado', cantidadResueltos: 0, puntosTotales: 0, minutosPenalizacionTotal: 0 },
    ])
    expect(agrupado.senior.map((f) => f.usuarioId)).toEqual(['u1'])
    expect(agrupado.junior.map((f) => f.usuarioId)).toEqual(['u2'])
    expect(agrupado.invitado.map((f) => f.usuarioId)).toEqual(['u3'])
  })
})
