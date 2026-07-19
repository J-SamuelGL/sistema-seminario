import { useState } from 'react'
import { toast } from 'sonner'
import { LoadingButton } from '#/components/LoadingButton'
import { SegmentedControl } from '#/components/SegmentedControl'
import type { LenguajeProgramacion } from '#/server/envios/validar'

function updateAt<T>(array: T[], index: number, updater: (item: T) => T): T[] {
  const next = array.slice()
  next[index] = updater(next[index])
  return next
}

export type TipoDatoFormulario =
  | 'int'
  | 'float'
  | 'bool'
  | 'string'
  | 'list<int>'
  | 'list<float>'
  | 'list<bool>'
  | 'list<string>'

const TIPOS_DATO: TipoDatoFormulario[] = [
  'int',
  'float',
  'bool',
  'string',
  'list<int>',
  'list<float>',
  'list<bool>',
  'list<string>',
]

const LENGUAJES_DISPONIBLES: LenguajeProgramacion[] = [
  'python',
  'javascript',
  'java',
  'csharp',
  'php',
]

export type DificultadFormulario = 'Fácil' | 'Intermedio' | 'Difícil'

const DIFICULTADES: { valor: DificultadFormulario; etiqueta: string }[] = [
  { valor: 'Fácil', etiqueta: 'Fácil' },
  { valor: 'Intermedio', etiqueta: 'Intermedio' },
  { valor: 'Difícil', etiqueta: 'Difícil' },
]

const GRUPOS: { valor: 'invitado_junior' | 'senior'; etiqueta: string }[] = [
  { valor: 'invitado_junior', etiqueta: 'Invitados + Junior' },
  { valor: 'senior', etiqueta: 'Senior' },
]

export type CategoriaProblemaFormulario = 'debugging' | 'normal'

const CATEGORIAS_PROBLEMA: {
  valor: CategoriaProblemaFormulario
  etiqueta: string
}[] = [
  { valor: 'normal', etiqueta: 'Normal' },
  { valor: 'debugging', etiqueta: 'Debugging' },
]

export type ParametroFormulario = { nombre: string; tipo: TipoDatoFormulario }
export type LenguajeFormulario = {
  lenguaje: LenguajeProgramacion
  nombreFuncion: string
  codigoInicial: string
}
export type CasoPruebaFormulario = {
  argumentosTexto: string[]
  salidaEsperadaTexto: string
  visible: boolean
}

export type ValorFormularioProblema = {
  titulo: string
  descripcion: string
  dificultad: DificultadFormulario
  categoriaProblema: CategoriaProblemaFormulario
  orden: number
  grupo: 'invitado_junior' | 'senior'
  puntos: number
  parametros: ParametroFormulario[]
  tipoRetorno: TipoDatoFormulario
  lenguajes: LenguajeFormulario[]
  casosPrueba: CasoPruebaFormulario[]
}

export type DatosProblemaEnviado = {
  titulo: string
  descripcion: string
  dificultad: DificultadFormulario
  categoriaProblema: CategoriaProblemaFormulario
  orden: number
  grupo: 'invitado_junior' | 'senior'
  puntos: number
  parametros: ParametroFormulario[]
  tipoRetorno: TipoDatoFormulario
  lenguajes: LenguajeFormulario[]
  casosPrueba: {
    argumentos: unknown[]
    salidaEsperada: unknown
    visible: boolean
  }[]
}

export function AdminProblemForm({
  initial,
  onSubmit,
  isPending = false,
}: {
  initial: ValorFormularioProblema
  onSubmit: (value: DatosProblemaEnviado) => void
  isPending?: boolean
}) {
  const [value, setValue] = useState(initial)

  function actualizarParametro(
    index: number,
    campo: 'nombre' | 'tipo',
    texto: string,
  ) {
    setValue({
      ...value,
      parametros: updateAt(value.parametros, index, (p) => ({
        ...p,
        [campo]: texto,
      })),
    })
  }

  function agregarParametro() {
    setValue({
      ...value,
      parametros: [...value.parametros, { nombre: '', tipo: 'int' }],
    })
  }

  function actualizarLenguaje(
    index: number,
    campo: 'nombreFuncion' | 'codigoInicial',
    texto: string,
  ) {
    setValue({
      ...value,
      lenguajes: updateAt(value.lenguajes, index, (l) => ({
        ...l,
        [campo]: texto,
      })),
    })
  }

  function alternarLenguaje(lenguaje: LenguajeProgramacion) {
    const existe = value.lenguajes.some((l) => l.lenguaje === lenguaje)
    if (existe) {
      setValue({
        ...value,
        lenguajes: value.lenguajes.filter((l) => l.lenguaje !== lenguaje),
      })
    } else {
      setValue({
        ...value,
        lenguajes: [
          ...value.lenguajes,
          { lenguaje, nombreFuncion: '', codigoInicial: '' },
        ],
      })
    }
  }

  function actualizarCasoPrueba(
    index: number,
    campo: 'salidaEsperadaTexto' | 'visible',
    valorCampo: string | boolean,
  ) {
    setValue({
      ...value,
      casosPrueba: updateAt(value.casosPrueba, index, (c) => ({
        ...c,
        [campo]: valorCampo,
      })),
    })
  }

  function actualizarArgumento(
    indexCaso: number,
    indexArgumento: number,
    texto: string,
  ) {
    setValue({
      ...value,
      casosPrueba: updateAt(value.casosPrueba, indexCaso, (caso) => ({
        ...caso,
        argumentosTexto: updateAt(
          caso.argumentosTexto,
          indexArgumento,
          () => texto,
        ),
      })),
    })
  }

  function agregarCasoPrueba() {
    setValue({
      ...value,
      casosPrueba: [
        ...value.casosPrueba,
        {
          argumentosTexto: value.parametros.map(() => ''),
          salidaEsperadaTexto: '',
          visible: true,
        },
      ],
    })
  }

  function manejarEnvio() {
    try {
      const casosPrueba = value.casosPrueba.map((caso) => ({
        argumentos: caso.argumentosTexto.map((texto) => JSON.parse(texto)),
        salidaEsperada: JSON.parse(caso.salidaEsperadaTexto),
        visible: caso.visible,
      }))
      onSubmit({ ...value, casosPrueba })
    } catch {
      toast.error(
        'Algún argumento o salida esperada no es JSON válido (ej. "hola" con comillas, [1,2,3] para listas, true/false para booleanos).',
      )
    }
  }

  return (
    <form
      className="flex flex-col gap-4 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        manejarEnvio()
      }}
    >
      <label className="flex flex-col gap-1">
        Título
        <input
          className="border p-2"
          placeholder="Título"
          value={value.titulo}
          onChange={(e) => setValue({ ...value, titulo: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1">
        Descripción
        <textarea
          className="border p-2"
          placeholder="Descripción (markdown)"
          value={value.descripcion}
          onChange={(e) => setValue({ ...value, descripcion: e.target.value })}
        />
      </label>
      <div>
        <span className="mb-2 block font-bold">Dificultad</span>
        <SegmentedControl
          options={DIFICULTADES}
          value={value.dificultad}
          onChange={(dificultad) => setValue({ ...value, dificultad })}
        />
      </div>
      <label className="flex flex-col gap-1">
        Puntos
        <input
          className="border p-2"
          type="number"
          placeholder="Puntos"
          value={value.puntos}
          onChange={(e) =>
            setValue({ ...value, puntos: Number(e.target.value) })
          }
        />
      </label>
      <div>
        <span className="mb-2 block font-bold">Grupo</span>
        <SegmentedControl
          options={GRUPOS}
          value={value.grupo}
          onChange={(grupo) => setValue({ ...value, grupo })}
        />
      </div>
      <div>
        <span className="mb-2 block font-bold">Categoría</span>
        <SegmentedControl
          options={CATEGORIAS_PROBLEMA}
          value={value.categoriaProblema}
          onChange={(categoriaProblema) =>
            setValue({ ...value, categoriaProblema })
          }
        />
      </div>

      <h3 className="font-bold">Parámetros de la función</h3>
      {value.parametros.map((p, i) => (
        <div key={i} className="flex gap-2">
          <label className="flex flex-col gap-1">
            Nombre
            <input
              className="border p-2"
              placeholder="nombre"
              value={p.nombre}
              onChange={(e) => actualizarParametro(i, 'nombre', e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            Tipo
            <select
              className="border p-2"
              value={p.tipo}
              onChange={(e) => actualizarParametro(i, 'tipo', e.target.value)}
            >
              {TIPOS_DATO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}
      <button
        type="button"
        className="rounded bg-gray-200 px-4 py-2"
        onClick={agregarParametro}
      >
        + Agregar parámetro
      </button>

      <label>
        Tipo de retorno:
        <select
          className="ml-2 border p-2"
          value={value.tipoRetorno}
          onChange={(e) =>
            setValue({
              ...value,
              tipoRetorno: e.target.value as TipoDatoFormulario,
            })
          }
        >
          {TIPOS_DATO.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <h3 className="font-bold">Lenguajes</h3>
      {LENGUAJES_DISPONIBLES.map((lenguaje) => {
        const index = value.lenguajes.findIndex((l) => l.lenguaje === lenguaje)
        const config = index >= 0 ? value.lenguajes[index] : null
        return (
          <div key={lenguaje} className="border p-2">
            <label>
              <input
                type="checkbox"
                checked={!!config}
                onChange={() => alternarLenguaje(lenguaje)}
              />
              <span className="ml-2">{lenguaje}</span>
            </label>
            {config && (
              <div className="mt-2 flex flex-col gap-2">
                <label className="flex flex-col gap-1">
                  Nombre de la función
                  <input
                    className="border p-2"
                    placeholder="Nombre de la función"
                    value={config.nombreFuncion}
                    onChange={(e) =>
                      actualizarLenguaje(index, 'nombreFuncion', e.target.value)
                    }
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Código inicial
                  <textarea
                    className="border p-2 font-mono"
                    placeholder="Código inicial"
                    value={config.codigoInicial}
                    onChange={(e) =>
                      actualizarLenguaje(index, 'codigoInicial', e.target.value)
                    }
                  />
                </label>
              </div>
            )}
          </div>
        )
      })}

      <h3 className="font-bold">Casos de prueba</h3>
      {value.casosPrueba.map((caso, i) => (
        <div key={i} className="flex flex-col gap-2 border p-2">
          {value.parametros.map((p, j) => (
            <label key={j} className="flex flex-col gap-1">
              {p.nombre || `Argumento ${j + 1}`}
              <input
                className="border p-2"
                placeholder={`${p.nombre} (JSON)`}
                value={caso.argumentosTexto[j] ?? ''}
                onChange={(e) => actualizarArgumento(i, j, e.target.value)}
              />
            </label>
          ))}
          <label className="flex flex-col gap-1">
            Salida esperada
            <input
              className="border p-2"
              placeholder="Salida esperada (JSON)"
              value={caso.salidaEsperadaTexto}
              onChange={(e) =>
                actualizarCasoPrueba(i, 'salidaEsperadaTexto', e.target.value)
              }
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={caso.visible}
              onChange={(e) =>
                actualizarCasoPrueba(i, 'visible', e.target.checked)
              }
            />
            <span className="ml-2">Visible para el participante</span>
          </label>
        </div>
      ))}
      <button
        type="button"
        className="rounded bg-gray-200 px-4 py-2"
        onClick={agregarCasoPrueba}
      >
        + Agregar caso de prueba
      </button>

      <LoadingButton
        type="submit"
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:bg-gray-300"
        isPending={isPending}
        label="Guardar"
        pendingLabel="Guardando..."
      />
    </form>
  )
}
