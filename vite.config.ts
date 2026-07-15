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
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
