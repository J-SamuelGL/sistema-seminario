import { useState } from 'react'
import { toast } from 'sonner'
import { LoadingButton } from '#/components/LoadingButton'
import { SegmentedControl } from '#/components/SegmentedControl'
import {
  TIPOS_DATO,
  LENGUAJES as LENGUAJES_DISPONIBLES,
} from '#/shared/dominio'
import {
  ADMIN_TITLE,
  ADMIN_CARD,
  ADMIN_LABEL_BASE,
  ADMIN_INPUT_BASE,
  ADMIN_TEXTAREA_BASE,
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
} from '#/components/adminBrandStyles'
import type {
  TipoDato,
  Dificultad,
  CategoriaProblema,
  Grupo,
} from '#/shared/dominio'
import type { LenguajeProgramacion } from '#/server/envios/validar'

function updateAt<T>(array: T[], index: number, updater: (item: T) => T): T[] {
  const next = array.slice()
  next[index] = updater(next[index])
  return next
}

// Los tipos del formulario reutilizan los del dominio (`#/shared/dominio`); los
// alias se conservan para no romper los imports existentes. Las listas de opciones
// con etiqueta son puramente de UI (orden y texto visibles), pero se tipan contra
// el dominio para que un valor mal escrito falle en compilación.
export type TipoDatoFormulario = TipoDato
export type DificultadFormulario = Dificultad
export type CategoriaProblemaFormulario = CategoriaProblema

const DIFICULTADES: { valor: Dificultad; etiqueta: string }[] = [
  { valor: 'Fácil', etiqueta: 'Fácil' },
  { valor: 'Intermedio', etiqueta: 'Intermedio' },
  { valor: 'Difícil', etiqueta: 'Difícil' },
]

const GRUPOS: { valor: Grupo; etiqueta: string }[] = [
  { valor: 'invitado_junior', etiqueta: 'Invitados + Junior' },
  { valor: 'senior', etiqueta: 'Senior' },
]

const CATEGORIAS_PROBLEMA: { valor: CategoriaProblema; etiqueta: string }[] = [
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
  grupo: Grupo
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
  grupo: Grupo
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
      className="flex flex-col gap-5 py-6"
      onSubmit={(e) => {
        e.preventDefault()
        manejarEnvio()
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className={ADMIN_LABEL_BASE}>Título</span>
        <input
          className={ADMIN_INPUT_BASE}
          placeholder="Título"
          value={value.titulo}
          onChange={(e) => setValue({ ...value, titulo: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={ADMIN_LABEL_BASE}>Descripción</span>
        <textarea
          className={ADMIN_TEXTAREA_BASE}
          placeholder="Descripción (markdown)"
          value={value.descripcion}
          onChange={(e) => setValue({ ...value, descripcion: e.target.value })}
        />
      </label>
      <div>
        <span className={`${ADMIN_LABEL_BASE} mb-2 block`}>Dificultad</span>
        <SegmentedControl
          options={DIFICULTADES}
          value={value.dificultad}
          onChange={(dificultad) => setValue({ ...value, dificultad })}
        />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={ADMIN_LABEL_BASE}>Puntos</span>
        <input
          className={ADMIN_INPUT_BASE}
          type="number"
          placeholder="Puntos"
          value={value.puntos}
          onChange={(e) =>
            setValue({ ...value, puntos: Number(e.target.value) })
          }
        />
      </label>
      <div>
        <span className={`${ADMIN_LABEL_BASE} mb-2 block`}>Grupo</span>
        <SegmentedControl
          options={GRUPOS}
          value={value.grupo}
          onChange={(grupo) => setValue({ ...value, grupo })}
        />
      </div>
      <div>
        <span className={`${ADMIN_LABEL_BASE} mb-2 block`}>Categoría</span>
        <SegmentedControl
          options={CATEGORIAS_PROBLEMA}
          value={value.categoriaProblema}
          onChange={(categoriaProblema) =>
            setValue({ ...value, categoriaProblema })
          }
        />
      </div>

      <h3 className={ADMIN_TITLE}>Parámetros de la función</h3>
      {value.parametros.map((p, i) => (
        <div key={i} className={`${ADMIN_CARD} flex gap-3 p-3`}>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={ADMIN_LABEL_BASE}>Nombre</span>
            <input
              className={ADMIN_INPUT_BASE}
              placeholder="nombre"
              value={p.nombre}
              onChange={(e) => actualizarParametro(i, 'nombre', e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={ADMIN_LABEL_BASE}>Tipo</span>
            <select
              className={ADMIN_INPUT_BASE}
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
        className={`self-start ${ADMIN_BUTTON_SECONDARY}`}
        onClick={agregarParametro}
      >
        + Agregar parámetro
      </button>

      <label className="flex flex-col gap-1.5">
        <span className={ADMIN_LABEL_BASE}>Tipo de retorno</span>
        <select
          className={ADMIN_INPUT_BASE}
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

      <h3 className={ADMIN_TITLE}>Lenguajes</h3>
      {LENGUAJES_DISPONIBLES.map((lenguaje) => {
        const index = value.lenguajes.findIndex((l) => l.lenguaje === lenguaje)
        const config = index >= 0 ? value.lenguajes[index] : null
        return (
          <div key={lenguaje} className={`${ADMIN_CARD} p-3`}>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="accent-admin-navy"
                checked={!!config}
                onChange={() => alternarLenguaje(lenguaje)}
              />
              <span className="font-medium text-admin-ink">{lenguaje}</span>
            </label>
            {config && (
              <div className="mt-3 flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className={ADMIN_LABEL_BASE}>Nombre de la función</span>
                  <input
                    className={ADMIN_INPUT_BASE}
                    placeholder="Nombre de la función"
                    value={config.nombreFuncion}
                    onChange={(e) =>
                      actualizarLenguaje(index, 'nombreFuncion', e.target.value)
                    }
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={ADMIN_LABEL_BASE}>Código inicial</span>
                  <textarea
                    className={ADMIN_TEXTAREA_BASE}
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

      <h3 className={ADMIN_TITLE}>Casos de prueba</h3>
      {value.casosPrueba.map((caso, i) => (
        <div key={i} className={`${ADMIN_CARD} flex flex-col gap-3 p-3`}>
          {value.parametros.map((p, j) => (
            <label key={j} className="flex flex-col gap-1.5">
              <span className={ADMIN_LABEL_BASE}>
                {p.nombre || `Argumento ${j + 1}`}
              </span>
              <input
                className={ADMIN_INPUT_BASE}
                placeholder={`${p.nombre} (JSON)`}
                value={caso.argumentosTexto[j] ?? ''}
                onChange={(e) => actualizarArgumento(i, j, e.target.value)}
              />
            </label>
          ))}
          <label className="flex flex-col gap-1.5">
            <span className={ADMIN_LABEL_BASE}>Salida esperada</span>
            <input
              className={ADMIN_INPUT_BASE}
              placeholder="Salida esperada (JSON)"
              value={caso.salidaEsperadaTexto}
              onChange={(e) =>
                actualizarCasoPrueba(i, 'salidaEsperadaTexto', e.target.value)
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-admin-ink-soft">
            <input
              type="checkbox"
              className="accent-admin-navy"
              checked={caso.visible}
              onChange={(e) =>
                actualizarCasoPrueba(i, 'visible', e.target.checked)
              }
            />
            Visible para el participante
          </label>
        </div>
      ))}
      <button
        type="button"
        className={`self-start ${ADMIN_BUTTON_SECONDARY}`}
        onClick={agregarCasoPrueba}
      >
        + Agregar caso de prueba
      </button>

      <LoadingButton
        type="submit"
        className={`self-start ${ADMIN_BUTTON_PRIMARY}`}
        isPending={isPending}
        label="Guardar"
        pendingLabel="Guardando..."
      />
    </form>
  )
}
