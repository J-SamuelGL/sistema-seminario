import { describe, it, expect } from 'vitest'
import { aplicarCambioEstadoManual } from '../src/server/envios/progreso'

describe('aplicarCambioEstadoManual', () => {
  it('al marcar completado, usa el timestamp del último run como creadoEn', () => {
    const resultado = aplicarCambioEstadoManual(
      'completado',
      'admin-1',
      new Date('2026-07-16T12:00:00Z'),
      new Date('2026-07-16T11:45:00Z'),
    )
    expect(resultado).toEqual({
      estadoProgreso: 'completado',
      aprobadoPorId: 'admin-1',
      aprobadoEn: new Date('2026-07-16T12:00:00Z'),
      creadoEn: new Date('2026-07-16T11:45:00Z'),
    })
  })

  it('al marcar aprobado_manual sin ningún run previo, usa el momento actual como creadoEn', () => {
    const resultado = aplicarCambioEstadoManual(
      'aprobado_manual',
      'admin-1',
      new Date('2026-07-16T12:00:00Z'),
      null,
    )
    expect(resultado.creadoEn).toEqual(new Date('2026-07-16T12:00:00Z'))
  })

  it('al volver a pendiente, no incluye creadoEn', () => {
    const resultado = aplicarCambioEstadoManual(
      'pendiente',
      'admin-1',
      new Date('2026-07-16T12:00:00Z'),
      new Date('2026-07-16T11:45:00Z'),
    )
    expect(resultado).toEqual({
      estadoProgreso: 'pendiente',
      aprobadoPorId: 'admin-1',
      aprobadoEn: new Date('2026-07-16T12:00:00Z'),
    })
    expect('creadoEn' in resultado).toBe(false)
  })
})
