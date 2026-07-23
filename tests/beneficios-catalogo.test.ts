import { describe, it, expect } from 'vitest'
import {
  CLAVES_VENTAJA,
  CLAVES_DESVENTAJA,
  CLAVES_BENEFICIO,
  CATALOGO_BENEFICIOS,
} from '../src/shared/beneficios'

describe('CATALOGO_BENEFICIOS', () => {
  it('tiene 7 ventajas y 6 desventajas, sin claves repetidas', () => {
    expect(CLAVES_VENTAJA.length).toBe(7)
    expect(CLAVES_DESVENTAJA.length).toBe(6)
    expect(new Set(CLAVES_BENEFICIO).size).toBe(13)
  })

  it('define una entrada de catálogo con texto para cada clave', () => {
    for (const clave of CLAVES_BENEFICIO) {
      expect(CATALOGO_BENEFICIOS[clave]).toBeDefined()
      expect(CATALOGO_BENEFICIOS[clave].texto.length).toBeGreaterThan(0)
    }
  })

  it('todas las desventajas piden objetivo de tipo participante', () => {
    for (const clave of CLAVES_DESVENTAJA) {
      expect(CATALOGO_BENEFICIOS[clave].tipoObjetivo).toBe('participante')
    }
  })

  it('solo consultar_ingeniero pide objetivo de tipo ingeniero', () => {
    const conIngeniero = CLAVES_BENEFICIO.filter(
      (c) => CATALOGO_BENEFICIOS[c].tipoObjetivo === 'ingeniero',
    )
    expect(conIngeniero).toEqual(['consultar_ingeniero'])
  })
})
