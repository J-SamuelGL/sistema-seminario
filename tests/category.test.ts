import { describe, it, expect } from 'vitest'
import { asegurarCategoriaNoDefinida } from '../src/server/auth/category'

describe('asegurarCategoriaNoDefinida', () => {
  it('does not throw when category is null', () => {
    expect(() => asegurarCategoriaNoDefinida({ categoria: null })).not.toThrow()
  })

  it('throws when category is already set', () => {
    expect(() => asegurarCategoriaNoDefinida({ categoria: 'junior' })).toThrow(
      'La categoría ya está definida',
    )
  })
})
