import Editor from '@monaco-editor/react'

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
}: {
  lenguaje: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Editor
      height="70vh"
      language={MONACO_LANGUAGE[lenguaje] ?? 'plaintext'}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      theme="vs-dark"
      options={{ minimap: { enabled: false }, fontSize: 14 }}
    />
  )
}
