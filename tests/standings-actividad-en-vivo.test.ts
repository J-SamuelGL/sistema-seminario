import { describe, it, expect } from 'vitest'
import { calcularActividadEnVivo } from '../src/server/standings/actividadEnVivo'

const ahora = new Date('2026-07-23T15:00:00Z')

describe('calcularActividadEnVivo', () => {
  it('incluye una corrida dentro de la ventana', () => {
    const resultado = calcularActividadEnVivo(
      [
        {
          usuarioId: 'u1',
          usuarioNombre: 'Ana',
          usuarioCategoria: 'invitado',
          problemaTitulo: 'Suma',
          ultimaEjecucionEn: new Date('2026-07-23T14:55:00Z'),
        },
      ],
      ahora,
      10,
    )
    expect(resultado).toEqual([
      {
        usuarioId: 'u1',
        usuarioNombre: 'Ana',
        usuarioCategoria: 'invitado',
        problemaTitulo: 'Suma',
      },
    ])
  })

  it('excluye una corrida fuera de la ventana', () => {
    const resultado = calcularActividadEnVivo(
      [
        {
          usuarioId: 'u1',
          usuarioNombre: 'Ana',
          usuarioCategoria: 'invitado',
          problemaTitulo: 'Suma',
          ultimaEjecucionEn: new Date('2026-07-23T14:40:00Z'),
        },
      ],
      ahora,
      10,
    )
    expect(resultado).toEqual([])
  })

  it('se queda solo con la corrida más reciente por usuario', () => {
    const resultado = calcularActividadEnVivo(
      [
        {
          usuarioId: 'u1',
          usuarioNombre: 'Ana',
          usuarioCategoria: 'invitado',
          problemaTitulo: 'Suma',
          ultimaEjecucionEn: new Date('2026-07-23T14:50:00Z'),
        },
        {
          usuarioId: 'u1',
          usuarioNombre: 'Ana',
          usuarioCategoria: 'invitado',
          problemaTitulo: 'Resta',
          ultimaEjecucionEn: new Date('2026-07-23T14:58:00Z'),
        },
      ],
      ahora,
      10,
    )
    expect(resultado).toEqual([
      {
        usuarioId: 'u1',
        usuarioNombre: 'Ana',
        usuarioCategoria: 'invitado',
        problemaTitulo: 'Resta',
      },
    ])
  })

  it('ignora corridas sin ultimaEjecucionEn', () => {
    const resultado = calcularActividadEnVivo(
      [
        {
          usuarioId: 'u1',
          usuarioNombre: 'Ana',
          usuarioCategoria: 'invitado',
          problemaTitulo: 'Suma',
          ultimaEjecucionEn: null,
        },
      ],
      ahora,
      10,
    )
    expect(resultado).toEqual([])
  })
})
