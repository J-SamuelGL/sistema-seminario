import { describe, it, expect } from 'vitest'
import { validateProblemInput } from '../src/server/problems/validate'

describe('validateProblemInput', () => {
  it('passes for a fully filled problem', () => {
    expect(
      validateProblemInput({
        title: 'Two Sum',
        description: 'Find two numbers...',
        difficulty: 'easy',
        allowedLanguages: ['python'],
      }),
    ).toEqual([])
  })

  it('reports missing title, description, and languages', () => {
    const errors = validateProblemInput({
      title: '  ',
      description: '',
      difficulty: 'easy',
      allowedLanguages: [],
    })
    expect(errors).toContain('El título es requerido')
    expect(errors).toContain('La descripción es requerida')
    expect(errors).toContain('Debe permitir al menos un lenguaje')
  })
})
