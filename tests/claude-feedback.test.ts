import { describe, it, expect } from 'vitest'
import { construirPromptComentario } from '../src/server/claude/feedback'

describe('construirPromptComentario', () => {
  it('asks for a style comment when the verdict is accepted', () => {
    const prompt = construirPromptComentario({
      tituloProblema: 'Two Sum',
      descripcionProblema: 'Find two numbers that add up to target.',
      codigo: 'def two_sum(): pass',
      veredicto: 'aceptado',
      salidaError: '',
    })
    expect(prompt).toContain('estilo o eficiencia')
    expect(prompt).not.toContain('sin escribir el código corregido')
  })

  it('asks for a hint without the fix when the verdict failed', () => {
    const prompt = construirPromptComentario({
      tituloProblema: 'Two Sum',
      descripcionProblema: 'Find two numbers that add up to target.',
      codigo: 'def two_sum(): pass',
      veredicto: 'respuesta_incorrecta',
      salidaError: '',
    })
    expect(prompt).toContain('sin escribir el código corregido')
  })

  it('includes stderr when present', () => {
    const prompt = construirPromptComentario({
      tituloProblema: 'Two Sum',
      descripcionProblema: 'desc',
      codigo: 'code',
      veredicto: 'error_ejecucion',
      salidaError: 'IndexError: list index out of range',
    })
    expect(prompt).toContain('IndexError: list index out of range')
  })
})
