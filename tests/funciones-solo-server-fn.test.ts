import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const DIRECTORIO_FUNCTIONS = join(__dirname, '..', 'src', 'server', 'functions')

// Los archivos de src/server/functions/ los importa código del cliente (rutas y
// src/server/queries/). El compilador de TanStack Start solo convierte en stubs
// RPC los exports creados con createServerFn; cualquier otro export (función
// plana, constante con lógica) conserva su cuerpo real en el bundle del
// navegador y arrastra sus imports — así se fugó db/client → mysql2 →
// safer-buffer al cliente y reventó producción con
// "Cannot read properties of undefined (reading 'prototype')".
// Helpers compartidos van en módulos de servidor puros (standings/, envios/,
// problems/, ...), no exportados desde functions/.
describe('src/server/functions solo exporta server functions', () => {
  const archivos = readdirSync(DIRECTORIO_FUNCTIONS).filter((f) =>
    f.endsWith('.ts'),
  )

  it.each(archivos)('%s no tiene exports planos', (archivo) => {
    const contenido = readFileSync(join(DIRECTORIO_FUNCTIONS, archivo), 'utf8')
    const lineas = contenido.split('\n')

    const exportsPlanos = lineas.filter(
      (linea) =>
        /^export\s+(async\s+)?(function|class|let|var)\b/.test(linea) ||
        (/^export\s+const\b/.test(linea) && !/createServerFn/.test(linea)),
    )

    expect(exportsPlanos, exportsPlanos.join('\n')).toEqual([])
  })
})
