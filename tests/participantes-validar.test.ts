import { describe, it, expect } from 'vitest'
import { validarDatosParticipante } from '../src/server/participantes/validar'

describe('validarDatosParticipante', () => {
  it('rechaza a un junior sin carné', () => {
    const resultado = validarDatosParticipante({ categoria: 'junior', carnet: null, semestre: '4' })
    expect(resultado.valido).toBe(false)
  })

  it('rechaza a un junior sin semestre', () => {
    const resultado = validarDatosParticipante({
      categoria: 'junior',
      carnet: '22-1234-2020',
      semestre: null,
    })
    expect(resultado.valido).toBe(false)
  })

  it('rechaza a un senior sin carné ni semestre', () => {
    const resultado = validarDatosParticipante({ categoria: 'senior', carnet: null, semestre: null })
    expect(resultado.valido).toBe(false)
  })

  it('acepta a un junior con carné y semestre', () => {
    expect(
      validarDatosParticipante({ categoria: 'junior', carnet: '22-1234-2020', semestre: '4' }),
    ).toEqual({ valido: true })
  })

  it('acepta a un senior con carné y semestre', () => {
    expect(
      validarDatosParticipante({ categoria: 'senior', carnet: '22-1234-2020', semestre: '8' }),
    ).toEqual({ valido: true })
  })

  it('acepta a un invitado sin carné ni semestre', () => {
    expect(validarDatosParticipante({ categoria: 'invitado', carnet: null, semestre: null })).toEqual(
      { valido: true },
    )
  })
})
