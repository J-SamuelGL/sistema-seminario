import { describe, it, expect, vi } from 'vitest'
import { determinarVeredicto } from '../src/server/judge/verdict'
import { ejecutarCasosPrueba } from '../src/server/judge/runTestCases'
import { ejecutarPiston } from '../src/server/piston/client'

vi.mock('../src/server/piston/client', () => ({
  ejecutarPiston: vi.fn(),
}))

describe('determinarVeredicto', () => {
  it('returns accepted when all cases pass', () => {
    const veredicto = determinarVeredicto([
      { entrada: '1', salidaEsperada: '2', salidaObtenida: '2', aprobado: true, salidaError: '', tiempoExcedido: false, codigoSalida: 0 },
    ])
    expect(veredicto).toBe('aceptado')
  })

  it('returns wrong_answer when a case fails without error', () => {
    const veredicto = determinarVeredicto([
      { entrada: '1', salidaEsperada: '2', salidaObtenida: '3', aprobado: false, salidaError: '', tiempoExcedido: false, codigoSalida: 0 },
    ])
    expect(veredicto).toBe('respuesta_incorrecta')
  })

  it('returns runtime_error when a case has a nonzero exit code', () => {
    const veredicto = determinarVeredicto([
      {
        entrada: '1',
        salidaEsperada: '2',
        salidaObtenida: '',
        aprobado: false,
        salidaError: 'Traceback',
        codigoSalida: 1,
        tiempoExcedido: false,
      },
    ])
    expect(veredicto).toBe('error_ejecucion')
  })

  it('returns accepted when a case passes despite incidental stderr output (nonzero-exit-code is what matters, not stderr presence)', () => {
    const veredicto = determinarVeredicto([
      {
        entrada: '1',
        salidaEsperada: '2',
        salidaObtenida: '2',
        aprobado: true,
        salidaError: 'DeprecationWarning: ...',
        codigoSalida: 0,
        tiempoExcedido: false,
      },
    ])
    expect(veredicto).toBe('aceptado')
  })

  it('returns timeout when a case timed out, taking priority over other failures', () => {
    const veredicto = determinarVeredicto([
      {
        entrada: '1',
        salidaEsperada: '2',
        salidaObtenida: '',
        aprobado: false,
        salidaError: 'Traceback',
        tiempoExcedido: true,
        codigoSalida: 1,
      },
    ])
    expect(veredicto).toBe('tiempo_excedido')
  })
})

describe('ejecutarCasosPrueba', () => {
  it('runs each test case through Piston and aggregates the verdict', async () => {
    vi.mocked(ejecutarPiston).mockImplementation(async (_lenguaje, _codigo, entradaEstandar) => ({
      salidaEstandar: entradaEstandar === '1 2' ? '3' : '999',
      salidaError: '',
      codigoSalida: 0,
      tiempoExcedido: false,
    }))

    const { resultados, veredicto } = await ejecutarCasosPrueba('python', 'code', [
      { entrada: '1 2', salidaEsperada: '3' },
      { entrada: '5 5', salidaEsperada: '10' },
    ])

    expect(resultados[0].aprobado).toBe(true)
    expect(resultados[1].aprobado).toBe(false)
    expect(veredicto).toBe('respuesta_incorrecta')
  })
})
