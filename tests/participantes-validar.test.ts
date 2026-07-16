import { describe, it, expect } from 'vitest'
import { datosParticipanteSchema } from '../src/server/participantes/validar'

function datosBase(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    nombre: 'Ana Pérez',
    correo: 'ana@example.com',
    categoria: 'junior',
    carnet: null,
    semestre: null,
    ...overrides,
  }
}

describe('datosParticipanteSchema', () => {
  it('rechaza a un junior sin carné', () => {
    const resultado = datosParticipanteSchema.safeParse(
      datosBase({ categoria: 'junior', carnet: null, semestre: '4' }),
    )
    expect(resultado.success).toBe(false)
  })

  it('rechaza a un junior sin semestre', () => {
    const resultado = datosParticipanteSchema.safeParse(
      datosBase({
        categoria: 'junior',
        carnet: '22-1234-2020',
        semestre: null,
      }),
    )
    expect(resultado.success).toBe(false)
  })

  it('rechaza a un senior sin carné ni semestre', () => {
    const resultado = datosParticipanteSchema.safeParse(
      datosBase({ categoria: 'senior', carnet: null, semestre: null }),
    )
    expect(resultado.success).toBe(false)
  })

  it('acepta a un junior con carné y semestre', () => {
    const resultado = datosParticipanteSchema.safeParse(
      datosBase({ categoria: 'junior', carnet: '22-1234-2020', semestre: '4' }),
    )
    expect(resultado.success).toBe(true)
  })

  it('acepta a un senior con carné y semestre', () => {
    const resultado = datosParticipanteSchema.safeParse(
      datosBase({ categoria: 'senior', carnet: '22-1234-2020', semestre: '8' }),
    )
    expect(resultado.success).toBe(true)
  })

  it('acepta a un invitado sin carné ni semestre y anula cualquier carné/semestre enviado', () => {
    const resultado = datosParticipanteSchema.safeParse(
      datosBase({ categoria: 'invitado', carnet: 'algo', semestre: '2' }),
    )
    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data.carnet).toBeNull()
      expect(resultado.data.semestre).toBeNull()
    }
  })

  it('rechaza un correo inválido', () => {
    const resultado = datosParticipanteSchema.safeParse(
      datosBase({ correo: 'no-es-correo' }),
    )
    expect(resultado.success).toBe(false)
  })

  it('rechaza un correo más largo que 255 caracteres', () => {
    const correoLargo = `${'a'.repeat(250)}@x.com`
    const resultado = datosParticipanteSchema.safeParse(
      datosBase({ correo: correoLargo }),
    )
    expect(resultado.success).toBe(false)
  })

  it('rechaza un nombre vacío', () => {
    const resultado = datosParticipanteSchema.safeParse(
      datosBase({ nombre: '  ' }),
    )
    expect(resultado.success).toBe(false)
  })
})
