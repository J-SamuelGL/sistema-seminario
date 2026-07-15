import { describe, it, expect } from 'vitest'
import { determinarVeredicto } from '../src/server/judge/verdict'

describe('determinarVeredicto', () => {
  it('returns accepted when all cases pass', () => {
    const veredicto = determinarVeredicto([
      {
        visible: true,
        argumentos: [1],
        salidaEsperada: '2',
        salidaObtenida: '2',
        salidaConsola: '',
        aprobado: true,
        salidaError: '',
        tiempoExcedido: false,
        codigoSalida: 0,
      },
    ])
    expect(veredicto).toBe('aceptado')
  })

  it('returns wrong_answer when a case fails without error', () => {
    const veredicto = determinarVeredicto([
      {
        visible: true,
        argumentos: [1],
        salidaEsperada: '2',
        salidaObtenida: '3',
        salidaConsola: '',
        aprobado: false,
        salidaError: '',
        tiempoExcedido: false,
        codigoSalida: 0,
      },
    ])
    expect(veredicto).toBe('respuesta_incorrecta')
  })

  it('returns runtime_error when a case has a nonzero exit code', () => {
    const veredicto = determinarVeredicto([
      {
        visible: true,
        argumentos: [1],
        salidaEsperada: '2',
        salidaObtenida: '',
        salidaConsola: '',
        aprobado: false,
        salidaError: 'Traceback',
        codigoSalida: 1,
        tiempoExcedido: false,
      },
    ])
    expect(veredicto).toBe('error_ejecucion')
  })

  it('returns timeout when a case timed out, taking priority over other failures', () => {
    const veredicto = determinarVeredicto([
      {
        visible: true,
        argumentos: [1],
        salidaEsperada: '2',
        salidaObtenida: '',
        salidaConsola: '',
        aprobado: false,
        salidaError: 'Traceback',
        tiempoExcedido: true,
        codigoSalida: 1,
      },
    ])
    expect(veredicto).toBe('tiempo_excedido')
  })

  it('returns error_ejecucion (not aceptado) when there are zero resultados', () => {
    expect(determinarVeredicto([])).toBe('error_ejecucion')
  })
})
