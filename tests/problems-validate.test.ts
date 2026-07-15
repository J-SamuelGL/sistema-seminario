import { describe, it, expect } from 'vitest'
import { validarDatosProblema } from '../src/server/problems/validate'

function problemaBase() {
  return {
    titulo: 'Contar vocales',
    descripcion: 'desc',
    grupo: 'invitado_junior' as const,
    puntos: 10,
    parametros: [{ nombre: 'texto', tipo: 'string' as const }],
    tipoRetorno: 'int' as const,
    lenguajes: [{ lenguaje: 'python', nombreFuncion: 'contar_vocales', codigoInicial: 'def contar_vocales(texto):\n  pass' }],
    casosPrueba: [
      { argumentos: ['hola'], salidaEsperada: 2, visible: true },
      { argumentos: ['mazatenango'], salidaEsperada: 5, visible: true },
      { argumentos: ['xyz'], salidaEsperada: 0, visible: true },
      { argumentos: ['seminario'], salidaEsperada: 4, visible: false },
    ],
  }
}

describe('validarDatosProblema', () => {
  it('passes for a fully filled problem', () => {
    expect(validarDatosProblema(problemaBase())).toEqual([])
  })

  it('reports missing title, description, and languages', () => {
    const errores = validarDatosProblema({ ...problemaBase(), titulo: '  ', descripcion: '', lenguajes: [] })
    expect(errores).toContain('El título es requerido')
    expect(errores).toContain('La descripción es requerida')
    expect(errores).toContain('Debe permitir al menos un lenguaje')
  })

  it('reporta cuando falta un grupo válido', () => {
    const errores = validarDatosProblema({ ...problemaBase(), grupo: '' as never })
    expect(errores).toContain('Debe indicar el grupo (invitado_junior o senior)')
  })

  it('reporta cuando falta el nombre de función o el código inicial de un lenguaje', () => {
    const errores = validarDatosProblema({
      ...problemaBase(),
      lenguajes: [{ lenguaje: 'python', nombreFuncion: '', codigoInicial: '' }],
    })
    expect(errores).toContain('Falta el nombre de función para python')
    expect(errores).toContain('Falta el código inicial para python')
  })

  it('reporta menos de 4 casos de prueba', () => {
    const errores = validarDatosProblema({ ...problemaBase(), casosPrueba: problemaBase().casosPrueba.slice(0, 2) })
    expect(errores).toContain('Debe haber al menos 4 casos de prueba')
  })

  it('reporta cuando todas las salidas esperadas son iguales', () => {
    const errores = validarDatosProblema({
      ...problemaBase(),
      casosPrueba: problemaBase().casosPrueba.map((c) => ({ ...c, salidaEsperada: 0 })),
    })
    expect(errores).toContain('Todos los casos de prueba tienen la misma salida esperada — agrega variedad')
  })

  it('reporta cuando no hay ningún caso visible', () => {
    const errores = validarDatosProblema({
      ...problemaBase(),
      casosPrueba: problemaBase().casosPrueba.map((c) => ({ ...c, visible: false })),
    })
    expect(errores).toContain('Debe haber al menos un caso de prueba visible')
  })

  it('reporta cuando no hay ningún caso oculto', () => {
    const errores = validarDatosProblema({
      ...problemaBase(),
      casosPrueba: problemaBase().casosPrueba.map((c) => ({ ...c, visible: true })),
    })
    expect(errores).toContain('Debe haber al menos un caso de prueba oculto')
  })

  it('reporta un argumento de tipo incorrecto', () => {
    const errores = validarDatosProblema({
      ...problemaBase(),
      casosPrueba: [
        { argumentos: [123], salidaEsperada: 2, visible: true },
        ...problemaBase().casosPrueba.slice(1),
      ],
    })
    expect(errores).toContain('El caso 1 tiene un argumento de tipo incorrecto')
  })

  it('reporta puntos inválidos', () => {
    const errores = validarDatosProblema({ ...problemaBase(), puntos: 0 })
    expect(errores).toContain('Los puntos deben ser un entero positivo')
  })
})
