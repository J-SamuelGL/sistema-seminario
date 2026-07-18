import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  server: {
    watch: {
      ignored: [
        '**/src/generated/**',
        '**/node_modules/**',
        '**/.git/**',
        '**/.claude/**',
      ],
    },
  },
  resolve: { tsconfigPaths: true },
  // Rolldown (motor de build de Vite 8) puede generar chunks cuyo orden de
  // ejecución no respeta el grafo de dependencias de los módulos, lo que
  // produce errores TDZ del tipo "Cannot read properties of undefined
  // (reading 'prototype')" en producción (visto en el chunk de
  // QueryClientProvider). strictExecutionOrder fuerza a Rolldown a
  // respetar ese orden. https://github.com/vitejs/rolldown-vite/issues/597
  build: { rolldownOptions: { output: { strictExecutionOrder: true } } },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
