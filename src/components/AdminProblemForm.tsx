import { useState } from 'react'

export type ValorFormularioProblema = {
  titulo: string
  descripcion: string
  dificultad: string
  lenguajesPermitidos: string[]
  orden: number
  grupo: 'invitado_junior' | 'senior'
  casosPrueba: { entrada: string; salidaEsperada: string }[]
}

export function AdminProblemForm({
  initial,
  onSubmit,
}: {
  initial: ValorFormularioProblema
  onSubmit: (value: ValorFormularioProblema) => void
}) {
  const [value, setValue] = useState(initial)

  function actualizarCasoPrueba(index: number, campo: 'entrada' | 'salidaEsperada', texto: string) {
    const next = value.casosPrueba.slice()
    next[index] = { ...next[index], [campo]: texto }
    setValue({ ...value, casosPrueba: next })
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
        value={value.titulo}
        onChange={(e) => setValue({ ...value, titulo: e.target.value })}
      />
      <textarea
        className="border p-2"
        placeholder="Descripción (markdown)"
        value={value.descripcion}
        onChange={(e) => setValue({ ...value, descripcion: e.target.value })}
      />
      <input
        className="border p-2"
        placeholder="Dificultad (easy/medium/hard)"
        value={value.dificultad}
        onChange={(e) => setValue({ ...value, dificultad: e.target.value })}
      />
      <input
        className="border p-2"
        placeholder="Lenguajes permitidos, separados por coma"
        value={value.lenguajesPermitidos.join(',')}
        onChange={(e) =>
          setValue({ ...value, lenguajesPermitidos: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
        }
      />
      <label>
        Grupo:
        <select
          className="ml-2 border p-2"
          value={value.grupo}
          onChange={(e) => setValue({ ...value, grupo: e.target.value as ValorFormularioProblema['grupo'] })}
        >
          <option value="invitado_junior">Invitados + Junior</option>
          <option value="senior">Senior</option>
        </select>
      </label>
      <h3 className="font-bold">Casos de prueba</h3>
      {value.casosPrueba.map((cp, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="border p-2"
            placeholder="Input"
            value={cp.entrada}
            onChange={(e) => actualizarCasoPrueba(i, 'entrada', e.target.value)}
          />
          <input
            className="border p-2"
            placeholder="Output esperado"
            value={cp.salidaEsperada}
            onChange={(e) => actualizarCasoPrueba(i, 'salidaEsperada', e.target.value)}
          />
        </div>
      ))}
      <button
        type="button"
        className="rounded bg-gray-200 px-4 py-2"
        onClick={() => setValue({ ...value, casosPrueba: [...value.casosPrueba, { entrada: '', salidaEsperada: '' }] })}
      >
        + Agregar caso de prueba
      </button>
      <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
        Guardar
      </button>
    </form>
  )
}
