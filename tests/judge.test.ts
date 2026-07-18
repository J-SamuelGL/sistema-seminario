import { describe, it, expect, vi } from 'vitest'
import { ejecutarCasosPrueba } from '../src/server/judge/runTestCases'
import { ejecutarJudge0 } from '../src/server/judge0/client'
import { MARCADOR_RESULTADO_JUEZ } from '../src/server/judge/harness/marcador'

vi.mock('../src/server/judge0/client', () => ({
  ejecutarJudge0: vi.fn(),
}))

describe('ejecutarCasosPrueba', () => {
  it('genera un programa por caso, compara contra el texto canónico y agrega el veredicto', async () => {
    vi.mocked(ejecutarJudge0).mockImplementation(
      async (_lenguaje, contenido) => ({
        salidaEstandar: contenido.includes('"hola"')
          ? `${MARCADOR_RESULTADO_JUEZ}2`
          : `${MARCADOR_RESULTADO_JUEZ}5`,
        salidaError: '',
        codigoSalida: 0,
        tiempoExcedido: false,
      }),
    )

    const firma = {
      nombreFuncion: 'contar_vocales',
      parametros: [{ nombre: 'texto', tipo: 'string' as const }],
      tipoRetorno: 'int' as const,
    }

    const { resultados, veredicto } = await ejecutarCasosPrueba(
      'python',
      'def contar_vocales(texto):\n  return 0',
      firma,
      [
        { argumentos: ['hola'], salidaEsperada: 2, visible: true },
        { argumentos: ['mazatenango'], salidaEsperada: 5, visible: false },
      ],
    )

    expect(resultados[0]).toMatchObject({
      visible: true,
      aprobado: true,
      salidaEsperada: '2',
      salidaObtenida: '2',
      salidaConsola: '',
    })
    expect(resultados[1]).toMatchObject({
      visible: false,
      aprobado: true,
      salidaEsperada: '5',
      salidaObtenida: '5',
    })
    expect(veredicto).toBe('aceptado')
  })

  it('marca respuesta_incorrecta si algún caso no coincide', async () => {
    vi.mocked(ejecutarJudge0).mockResolvedValue({
      salidaEstandar: `${MARCADOR_RESULTADO_JUEZ}0`,
      salidaError: '',
      codigoSalida: 0,
      tiempoExcedido: false,
    })

    const firma = {
      nombreFuncion: 'f',
      parametros: [{ nombre: 'x', tipo: 'int' as const }],
      tipoRetorno: 'int' as const,
    }

    const { veredicto } = await ejecutarCasosPrueba(
      'python',
      'def f(x):\n  return 0',
      firma,
      [{ argumentos: [1], salidaEsperada: 1, visible: true }],
    )
    expect(veredicto).toBe('respuesta_incorrecta')
  })

  it('separa los prints del participante del resultado comparado, sin que rompan el veredicto', async () => {
    vi.mocked(ejecutarJudge0).mockResolvedValue({
      salidaEstandar: `depurando\nmas depuracion\n${MARCADOR_RESULTADO_JUEZ}1`,
      salidaError: '',
      codigoSalida: 0,
      tiempoExcedido: false,
    })

    const firma = {
      nombreFuncion: 'f',
      parametros: [{ nombre: 'x', tipo: 'int' as const }],
      tipoRetorno: 'int' as const,
    }

    const { resultados, veredicto } = await ejecutarCasosPrueba(
      'python',
      'def f(x):\n  print("depurando")\n  return x',
      firma,
      [{ argumentos: [1], salidaEsperada: 1, visible: true }],
    )

    expect(resultados[0]).toMatchObject({
      aprobado: true,
      salidaObtenida: '1',
      salidaConsola: 'depurando\nmas depuracion',
    })
    expect(veredicto).toBe('aceptado')
  })
})
