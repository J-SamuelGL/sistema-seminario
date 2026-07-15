import { describe, it, expect } from 'vitest'
import { ocultarDetalleCasosNoVisibles } from '../src/server/judge/resultadoPublico'
import type { ResultadoCaso } from '../src/server/judge/verdict'

describe('ocultarDetalleCasosNoVisibles', () => {
  it('conserva el detalle completo de los casos visibles, incluida la consola', () => {
    const resultados: ResultadoCaso[] = [
      {
        visible: true,
        argumentos: ['hola'],
        salidaEsperada: '2',
        salidaObtenida: '2',
        salidaConsola: 'depurando',
        aprobado: true,
        salidaError: '',
        tiempoExcedido: false,
        codigoSalida: 0,
      },
    ]
    const publico = ocultarDetalleCasosNoVisibles(resultados)
    expect(publico[0]).toEqual({
      visible: true,
      argumentos: ['hola'],
      salidaEsperada: '2',
      salidaObtenida: '2',
      salidaConsola: 'depurando',
      aprobado: true,
      salidaError: '',
    })
  })

  it('oculta argumentos, salidaEsperada, salidaObtenida y salidaConsola de los casos ocultos', () => {
    const resultados: ResultadoCaso[] = [
      {
        visible: false,
        argumentos: ['secreto'],
        salidaEsperada: '99',
        salidaObtenida: '0',
        salidaConsola: 'pista secreta',
        aprobado: false,
        salidaError: '',
        tiempoExcedido: false,
        codigoSalida: 0,
      },
    ]
    const publico = ocultarDetalleCasosNoVisibles(resultados)
    expect(publico[0]).toEqual({ visible: false, aprobado: false })
    expect(JSON.stringify(publico)).not.toContain('secreto')
    expect(JSON.stringify(publico)).not.toContain('99')
    expect(JSON.stringify(publico)).not.toContain('pista secreta')
  })
})
