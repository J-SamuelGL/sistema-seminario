import { describe, it, expect } from 'vitest'
import { buildFeedbackPrompt } from '../src/server/claude/feedback'

describe('buildFeedbackPrompt', () => {
  it('asks for a style comment when the verdict is accepted', () => {
    const prompt = buildFeedbackPrompt({
      problemTitle: 'Two Sum',
      problemDescription: 'Find two numbers that add up to target.',
      code: 'def two_sum(): pass',
      verdict: 'accepted',
      stderr: '',
    })
    expect(prompt).toContain('estilo o eficiencia')
    expect(prompt).not.toContain('sin escribir el código corregido')
  })

  it('asks for a hint without the fix when the verdict failed', () => {
    const prompt = buildFeedbackPrompt({
      problemTitle: 'Two Sum',
      problemDescription: 'Find two numbers that add up to target.',
      code: 'def two_sum(): pass',
      verdict: 'wrong_answer',
      stderr: '',
    })
    expect(prompt).toContain('sin escribir el código corregido')
  })

  it('includes stderr when present', () => {
    const prompt = buildFeedbackPrompt({
      problemTitle: 'Two Sum',
      problemDescription: 'desc',
      code: 'code',
      verdict: 'runtime_error',
      stderr: 'IndexError: list index out of range',
    })
    expect(prompt).toContain('IndexError: list index out of range')
  })
})
