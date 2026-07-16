import { describe, it, expect } from 'vitest'
import { aplicarAprobacionManual, revertirAprobacionEnvio } from '../src/server/envios/aprobacion'

describe('aplicarAprobacionManual', () => {
  it('guarda el veredicto original la primera vez que se aprueba', () => {
    const resultado = aplicarAprobacionManual(
      { estado: 'respuesta_incorrecta', veredictoOriginal: null },
      'admin-1',
      new Date('2026-07-15T10:00:00Z'),
    )
    expect(resultado).toEqual({
      estado: 'aceptado',
      veredictoOriginal: 'respuesta_incorrecta',
      aprobadoPorId: 'admin-1',
      aprobadoEn: new Date('2026-07-15T10:00:00Z'),
    })
  })

  it('no pisa el veredicto original si ya estaba aprobado manualmente', () => {
    const resultado = aplicarAprobacionManual(
      { estado: 'aceptado', veredictoOriginal: 'error_ejecucion' },
      'admin-2',
      new Date('2026-07-15T11:00:00Z'),
    )
    expect(resultado.veredictoOriginal).toBe('error_ejecucion')
  })
})

describe('revertirAprobacionEnvio', () => {
  it('restaura el veredicto original y limpia los campos de auditoría', () => {
    const resultado = revertirAprobacionEnvio({ veredictoOriginal: 'tiempo_excedido' })
    expect(resultado).toEqual({
      estado: 'tiempo_excedido',
      veredictoOriginal: null,
      aprobadoPorId: null,
      aprobadoEn: null,
    })
  })

  it('lanza un error si el envío no fue aprobado manualmente', () => {
    expect(() => revertirAprobacionEnvio({ veredictoOriginal: null })).toThrow()
  })
})
