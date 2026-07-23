import { describe, it, expect } from 'vitest'
import {
  calcularEstadisticasProblemas,
  problemasResueltosPorTodos,
  problemasResueltosPorNadie,
  problemaEnLlamasPorGrupo,
} from '../src/server/standings/estadisticasProblemas'

const problemas = [
  { id: 'p1', titulo: 'Suma', grupo: 'invitado_junior' as const },
  { id: 'p2', titulo: 'Resta', grupo: 'senior' as const },
]

describe('calcularEstadisticasProblemas', () => {
  it('cuenta elegibles por grupo a partir de la categoría de cada usuario', () => {
    const stats = calcularEstadisticasProblemas(
      [
        { categoria: 'invitado' },
        { categoria: 'junior' },
        { categoria: 'senior' },
      ],
      [],
      [],
      problemas,
    )
    expect(stats.find((s) => s.problemaId === 'p1')?.elegibles).toBe(2)
    expect(stats.find((s) => s.problemaId === 'p2')?.elegibles).toBe(1)
  })

  it('cuenta resueltos como usuarios distintos con estado no pendiente', () => {
    const stats = calcularEstadisticasProblemas(
      [{ categoria: 'invitado' }, { categoria: 'invitado' }],
      [
        { usuarioId: 'u1', problemaId: 'p1', estadoProgreso: 'completado' },
        { usuarioId: 'u1', problemaId: 'p1', estadoProgreso: 'completado' },
        { usuarioId: 'u2', problemaId: 'p1', estadoProgreso: 'pendiente' },
      ],
      [],
      problemas,
    )
    expect(stats.find((s) => s.problemaId === 'p1')?.resueltos).toBe(1)
  })

  it('calcula tasaAciertos sobre participantes con al menos un intento', () => {
    const stats = calcularEstadisticasProblemas(
      [{ categoria: 'invitado' }],
      [{ usuarioId: 'u1', problemaId: 'p1', estadoProgreso: 'completado' }],
      [
        { usuarioId: 'u1', problemaId: 'p1', contador: 3 },
        { usuarioId: 'u2', problemaId: 'p1', contador: 5 },
      ],
      problemas,
    )
    const p1 = stats.find((s) => s.problemaId === 'p1')!
    expect(p1.intentosTotales).toBe(8)
    expect(p1.tasaAciertos).toBeCloseTo(0.5)
  })

  it('devuelve tasaAciertos 0 si nadie ha intentado', () => {
    const stats = calcularEstadisticasProblemas([], [], [], problemas)
    expect(stats.every((s) => s.tasaAciertos === 0)).toBe(true)
  })
})

describe('problemasResueltosPorTodos / problemasResueltosPorNadie', () => {
  const base = [
    {
      problemaId: 'p1',
      titulo: 'Suma',
      grupo: 'invitado_junior' as const,
      elegibles: 2,
      resueltos: 2,
      intentosTotales: 4,
      tasaAciertos: 1,
    },
    {
      problemaId: 'p2',
      titulo: 'Resta',
      grupo: 'senior' as const,
      elegibles: 3,
      resueltos: 0,
      intentosTotales: 0,
      tasaAciertos: 0,
    },
  ]

  it('identifica el problema resuelto por todos los elegibles', () => {
    expect(problemasResueltosPorTodos(base).map((s) => s.problemaId)).toEqual([
      'p1',
    ])
  })

  it('identifica el problema que nadie ha resuelto', () => {
    expect(problemasResueltosPorNadie(base).map((s) => s.problemaId)).toEqual([
      'p2',
    ])
  })

  it('excluye problemas sin elegibles de "resuelto por nadie"', () => {
    const sinElegibles = [
      ...base,
      {
        problemaId: 'p3',
        titulo: 'Sin elegibles',
        grupo: 'senior' as const,
        elegibles: 0,
        resueltos: 0,
        intentosTotales: 0,
        tasaAciertos: 0,
      },
    ]
    expect(
      problemasResueltosPorNadie(sinElegibles).map((s) => s.problemaId),
    ).toEqual(['p2'])
  })
})

describe('problemaEnLlamasPorGrupo', () => {
  it('elige, por grupo, el problema con más fallos acumulados', () => {
    const stats = [
      {
        problemaId: 'p1',
        titulo: 'Fácil',
        grupo: 'invitado_junior' as const,
        elegibles: 5,
        resueltos: 4,
        intentosTotales: 6,
        tasaAciertos: 0.8,
      },
      {
        problemaId: 'p2',
        titulo: 'Difícil',
        grupo: 'invitado_junior' as const,
        elegibles: 5,
        resueltos: 1,
        intentosTotales: 20,
        tasaAciertos: 0.2,
      },
    ]
    const resultado = problemaEnLlamasPorGrupo(stats)
    expect(resultado.invitado_junior?.problemaId).toBe('p2')
    expect(resultado.senior).toBeUndefined()
  })
})
