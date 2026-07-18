import { Editor, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'

// Por defecto @monaco-editor/react carga el editor inyectando un <script>
// hacia cdn.jsdelivr.net en tiempo de ejecución; si esa petición queda
// colgada (red restringida del venue, firewall, etc.) el editor se queda
// en "Loading..." para siempre. Apuntar el loader al paquete monaco-editor
// ya empaquetado localmente evita depender de esa red externa.
loader.config({ monaco })

const MONACO_LANGUAGE: Record<string, string> = {
  python: 'python',
  javascript: 'javascript',
  java: 'java',
  csharp: 'csharp',
  php: 'php',
}

export function CodeEditor({
  lenguaje,
  value,
  onChange,
  readOnly,
}: {
  lenguaje: string
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
}) {
  return (
    <Editor
      height="70vh"
      language={MONACO_LANGUAGE[lenguaje] ?? 'plaintext'}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      theme="vs-dark"
      options={{ minimap: { enabled: false }, fontSize: 14, readOnly }}
    />
  )
}
