import { useState } from 'react'

export type ProblemFormValue = {
  title: string
  description: string
  difficulty: string
  allowedLanguages: string[]
  sortOrder: number
  testCases: { input: string; expectedOutput: string }[]
}

export function AdminProblemForm({
  initial,
  onSubmit,
}: {
  initial: ProblemFormValue
  onSubmit: (value: ProblemFormValue) => void
}) {
  const [value, setValue] = useState(initial)

  function updateTestCase(index: number, field: 'input' | 'expectedOutput', text: string) {
    const next = value.testCases.slice()
    next[index] = { ...next[index], [field]: text }
    setValue({ ...value, testCases: next })
  }

  return (
    <form
      className="flex flex-col gap-4 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(value)
      }}
    >
      <input
        className="border p-2"
        placeholder="Título"
        value={value.title}
        onChange={(e) => setValue({ ...value, title: e.target.value })}
      />
      <textarea
        className="border p-2"
        placeholder="Descripción (markdown)"
        value={value.description}
        onChange={(e) => setValue({ ...value, description: e.target.value })}
      />
      <input
        className="border p-2"
        placeholder="Dificultad (easy/medium/hard)"
        value={value.difficulty}
        onChange={(e) => setValue({ ...value, difficulty: e.target.value })}
      />
      <input
        className="border p-2"
        placeholder="Lenguajes permitidos, separados por coma"
        value={value.allowedLanguages.join(',')}
        onChange={(e) =>
          setValue({ ...value, allowedLanguages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
        }
      />
      <h3 className="font-bold">Casos de prueba</h3>
      {value.testCases.map((tc, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="border p-2"
            placeholder="Input"
            value={tc.input}
            onChange={(e) => updateTestCase(i, 'input', e.target.value)}
          />
          <input
            className="border p-2"
            placeholder="Output esperado"
            value={tc.expectedOutput}
            onChange={(e) => updateTestCase(i, 'expectedOutput', e.target.value)}
          />
        </div>
      ))}
      <button
        type="button"
        className="rounded bg-gray-200 px-4 py-2"
        onClick={() => setValue({ ...value, testCases: [...value.testCases, { input: '', expectedOutput: '' }] })}
      >
        + Agregar caso de prueba
      </button>
      <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
        Guardar
      </button>
    </form>
  )
}
