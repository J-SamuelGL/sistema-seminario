import { describe, it, expect } from 'vitest'
import { separarSalidaConsola } from '../src/server/judge/consola'
import { MARCADOR_RESULTADO_JUEZ } from '../src/server/judge/harness/marcador'

describe('separarSalidaConsola', () => {
  it('separa la consola del usuario del resultado cuando hay marcador', () => {
    const cruda = `hola\nmundo\n${MARCADOR_RESULTADO_JUEZ}42`
    expect(separarSalidaConsola(cruda)).toEqual({
      salidaConsola: 'hola\nmundo',
      salidaResultado: '42',
    })
  })

  it('devuelve consola vacía si el usuario no imprimió nada antes del marcador', () => {
    const cruda = `${MARCADOR_RESULTADO_JUEZ}42`
    expect(separarSalidaConsola(cruda)).toEqual({
      salidaConsola: '',
      salidaResultado: '42',
    })
  })

  it('trata todo como consola y resultado vacío si el marcador nunca aparece (timeout o crash)', () => {
    const cruda = 'algo se imprimió antes de morir'
    expect(separarSalidaConsola(cruda)).toEqual({
      salidaConsola: 'algo se imprimió antes de morir',
      salidaResultado: '',
    })
  })
})
