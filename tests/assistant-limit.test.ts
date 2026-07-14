import { describe, it, expect } from 'vitest'
import { canAskQuestion } from '../src/server/assistant/limit'

describe('canAskQuestion', () => {
  it('allows a junior participant with 0 questions used', () => {
    expect(canAskQuestion({ category: 'junior', aiQuestionsUsed: 0 })).toBe(
      true,
    )
  })

  it('allows a junior participant with 1 question used', () => {
    expect(canAskQuestion({ category: 'junior', aiQuestionsUsed: 1 })).toBe(
      true,
    )
  })

  it('blocks a junior participant with 2 questions used', () => {
    expect(canAskQuestion({ category: 'junior', aiQuestionsUsed: 2 })).toBe(
      false,
    )
  })

  it('blocks a senior participant regardless of questions used', () => {
    expect(canAskQuestion({ category: 'senior', aiQuestionsUsed: 0 })).toBe(
      false,
    )
  })
})
