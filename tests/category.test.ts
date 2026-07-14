import { describe, it, expect } from 'vitest'
import { assertCategoryNotSet } from '../src/server/auth/category'

describe('assertCategoryNotSet', () => {
  it('does not throw when category is null', () => {
    expect(() => assertCategoryNotSet({ category: null })).not.toThrow()
  })

  it('throws when category is already set', () => {
    expect(() => assertCategoryNotSet({ category: 'junior' })).toThrow(
      'Category already set',
    )
  })
})
