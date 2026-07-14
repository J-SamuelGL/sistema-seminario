import { describe, it, expect } from 'vitest'
import { validarDatosProblema } from '../src/server/problems/validate'

describe('validarDatosProblema', () => {
  it('passes for a fully filled problem', () => {
    expect(
      validarDatosProblema({
        titulo: 'Two Sum',
        descripcion: 'Find two numbers...',
        dificultad: 'easy',
        lenguajesPermitidos: ['python'],
      }),
    ).toEqual([])
  })

  it('reports missing title, description, and languages', () => {
    const errores = validarDatosProblema({
      titulo: '  ',
      descripcion: '',
      dificultad: 'easy',
      lenguajesPermitidos: [],
    })
    expect(errores).toContain('El título es requerido')
    expect(errores).toContain('La descripción es requerida')
    expect(errores).toContain('Debe permitir al menos un lenguaje')
  })
})
