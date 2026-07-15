import { describe, it, expect, vi } from 'vitest'
import { ejecutarCasosPrueba } from '../src/server/judge/runTestCases'
import { ejecutarPiston } from '../src/server/piston/client'

vi.mock('../src/server/piston/client', () => ({
  ejecutarPiston: vi.fn(),
}))

describe('ejecutarCasosPrueba', () => {
  it('genera un programa por caso, compara contra el texto canónico y agrega el veredicto', async () => {
    vi.mocked(ejecutarPiston).mockImplementation(async (_lenguaje, _archivo, contenido) => ({
      salidaEstandar: (contenido as string).includes('"hola"') ? '2' : '5',
      salidaError: '',
      codigoSalida: 0,
      tiempoExcedido: false,
    }))

    const firma = {
      nombreFuncion: 'contar_vocales',
      parametros: [{ nombre: 'texto', tipo: 'string' as const }],
      tipoRetorno: 'int' as const,
    }

    const { resultados, veredicto } = await ejecutarCasosPrueba('python', 'def contar_vocales(texto):\n  return 0', firma, [
      { argumentos: ['hola'], salidaEsperada: 2, visible: true },
      { argumentos: ['mazatenango'], salidaEsperada: 5, visible: false },
    ])

    expect(resultados[0]).toMatchObject({ visible: true, aprobado: true, salidaEsperada: '2', salidaObtenida: '2' })
    expect(resultados[1]).toMatchObject({ visible: false, aprobado: true, salidaEsperada: '5', salidaObtenida: '5' })
    expect(veredicto).toBe('aceptado')
  })

  it('marca respuesta_incorrecta si algún caso no coincide', async () => {
    vi.mocked(ejecutarPiston).mockResolvedValue({
      salidaEstandar: '0',
      salidaError: '',
      codigoSalida: 0,
      tiempoExcedido: false,
    })

    const firma = {
      nombreFuncion: 'f',
      parametros: [{ nombre: 'x', tipo: 'int' as const }],
      tipoRetorno: 'int' as const,
    }

    const { veredicto } = await ejecutarCasosPrueba('python', 'def f(x):\n  return 0', firma, [
      { argumentos: [1], salidaEsperada: 1, visible: true },
    ])
    expect(veredicto).toBe('respuesta_incorrecta')
  })
})
