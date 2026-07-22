import { describe, it, expect } from 'vitest'
import {
  aCategoria,
  ROLES,
  CATEGORIAS,
  SEMESTRES,
  DIFICULTADES,
  CATEGORIAS_PROBLEMA,
  GRUPOS,
  LENGUAJES,
  TIPOS_DATO,
  ESTADOS_ENVIO,
  ESTADOS_PROGRESO,
} from '../src/shared/dominio'
import {
  usuarios,
  problemas,
  problemaLenguajes,
  envios,
  corridas,
} from '../src/server/db/schema'

describe('aCategoria', () => {
  it('devuelve la categoría tipada para valores válidos', () => {
    expect(aCategoria('invitado')).toBe('invitado')
    expect(aCategoria('junior')).toBe('junior')
    expect(aCategoria('senior')).toBe('senior')
  })

  it('lanza para valores fuera del dominio', () => {
    expect(() => aCategoria('admin')).toThrow(/inválida/)
    expect(() => aCategoria('')).toThrow(/inválida/)
  })
})

// Guard anti-deriva: las columnas `mysqlEnum` del esquema deben seguir tomando
// sus valores (y orden) de las listas de `#/shared/dominio`. Si alguien vuelve a
// escribir un enum a mano en el esquema, este test falla.
describe('los enums del esquema coinciden con la fuente única de dominio', () => {
  const casos: [string, readonly string[], readonly string[]][] = [
    ['usuario.rol', usuarios.rol.enumValues, ROLES],
    ['usuario.categoria', usuarios.categoria.enumValues, CATEGORIAS],
    ['usuario.semestre', usuarios.semestre.enumValues, SEMESTRES],
    ['problemas.dificultad', problemas.dificultad.enumValues, DIFICULTADES],
    [
      'problemas.categoria_problema',
      problemas.categoriaProblema.enumValues,
      CATEGORIAS_PROBLEMA,
    ],
    ['problemas.grupo', problemas.grupo.enumValues, GRUPOS],
    ['problemas.tipo_retorno', problemas.tipoRetorno.enumValues, TIPOS_DATO],
    [
      'problema_lenguajes.lenguaje',
      problemaLenguajes.lenguaje.enumValues,
      LENGUAJES,
    ],
    ['envios.estado', envios.estado.enumValues, ESTADOS_ENVIO],
    [
      'envios.estado_progreso',
      envios.estadoProgreso.enumValues,
      ESTADOS_PROGRESO,
    ],
    [
      'corridas.ultimo_veredicto',
      corridas.ultimoVeredicto.enumValues,
      ESTADOS_ENVIO,
    ],
  ]

  it.each(casos)('%s', (_nombre, columna, dominio) => {
    expect(columna).toEqual([...dominio])
  })
})
