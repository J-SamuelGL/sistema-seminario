import { useState } from 'react'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { ejecutarCodigo } from '#/server/functions/run'
import {
  problemaQueryOptions,
  problemasQueryOptions,
} from '#/server/queries/problemas'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'
import { miProgresoQueryOptions } from '#/server/queries/progreso'
import { misSesionesActivasQueryOptions } from '#/server/queries/sesiones'
import { ProblemDescription } from '#/components/ProblemDescription'
import { CodeEditor } from '#/components/CodeEditor'
import { RunResults } from '#/components/RunResults'
import { AssistantModal } from '#/components/AssistantModal'
import { ProblemSolvedModal } from '#/components/ProblemSolvedModal'
import { SesionesMultiplesModal } from '#/components/SesionesMultiplesModal'
import { LoadingButton } from '#/components/LoadingButton'
import { useToastMutation } from '#/components/useToastMutation'
import { usePrevNextProblema } from '#/components/usePrevNextProblema'
import { serializarCanonico } from '#/shared/serializar'
import { CornerFrame } from '#/components/CornerFrame'
import {
  BUTTON_TERMINAL_RUN,
  BUTTON_TERMINAL_ASSIST,
  BUTTON_TERMINAL_NAV,
  NAV_ARROW_BUTTON,
  LOGRO_TEXT_NEUTRO,
} from '#/components/brandStyles'
import type { LenguajeProgramacion } from '#/server/envios/validar'

export const Route = createFileRoute('/_app/problemas/$problemaId')({
  loader: async ({ context, params }) => {
    const [datosProblema] = await Promise.all([
      context.queryClient.ensureQueryData(
        problemaQueryOptions(params.problemaId),
      ),
      context.queryClient.ensureQueryData(usuarioActualOpcionalQueryOptions()),
      context.queryClient.ensureQueryData(problemasQueryOptions()),
      context.queryClient.ensureQueryData(miProgresoQueryOptions()),
    ])
    // Un problema ya resuelto no se puede volver a ver ni editar: se
    // redirige a la lista en vez de mostrar el editor bloqueado.
    if (datosProblema.resuelto) throw redirect({ to: '/problemas' })
  },
  component: ProblemDetailPage,
})

function ProblemDetailPage() {
  const { problemaId } = Route.useParams()
  // key={problemaId} fuerza un remount completo al navegar entre problemas:
  // sin esto, TanStack Router reutiliza la misma instancia del componente
  // (solo cambia el param de la misma ruta), y el useState de `codigo`/
  // `lenguaje` de abajo nunca se vuelve a inicializar con los datos del
  // nuevo problema.
  return <ProblemDetailContent key={problemaId} problemaId={problemaId} />
}

function ProblemDetailContent({ problemaId }: { problemaId: string }) {
  const navigate = useNavigate()
  const { data: datosProblema } = useSuspenseQuery(
    problemaQueryOptions(problemaId),
  )
  const { data: user } = useSuspenseQuery(usuarioActualOpcionalQueryOptions())
  const { data: listaProblemas } = useSuspenseQuery(problemasQueryOptions())
  const { data: progreso } = useSuspenseQuery(miProgresoQueryOptions())
  const { problema, casosPrueba, lenguajes, resuelto } = datosProblema
  const resueltosIds = new Set(
    progreso.problemas
      .filter((p) => p.estadoProgreso !== 'pendiente')
      .map((p) => p.problemaId),
  )
  // Los problemas ya resueltos no se pueden volver a abrir (ver loader),
  // así que la navegación anterior/siguiente los salta en vez de llevar a
  // un problema al que el participante no puede entrar.
  const { anterior, siguiente, indice } = usePrevNextProblema(
    listaProblemas,
    resueltosIds,
    problemaId,
  )
  // Se re-verifica en cada entrada a la página (el remount por problemaId +
  // refetchOnMount 'always' fuerzan la consulta): si la cuenta tiene más de
  // una sesión activa, un modal bloquea la página hasta cerrar las demás.
  const { data: sesiones } = useQuery({
    ...misSesionesActivasQueryOptions(),
    enabled: user != null && user.rol !== 'admin',
  })
  const [lenguaje, setLenguaje] = useState<LenguajeProgramacion>(
    lenguajes[0]?.lenguaje ?? 'python',
  )
  const [codigo, setCodigo] = useState(lenguajes[0]?.codigoInicial ?? '')
  const [mostrarAsistente, setMostrarAsistente] = useState(false)

  const ejecutar = useToastMutation({
    mutationFn: () =>
      ejecutarCodigo({ data: { problemaId, lenguaje, codigo } }),
  })

  if (!problema) {
    return (
      <div className="p-8">
        <h1 className="font-display text-xl font-bold text-ink">
          Problema no encontrado
        </h1>
        <p className="text-red-600">
          No existe un problema con el id "{problemaId}".
        </p>
      </div>
    )
  }

  const ejemplos = casosPrueba
    .filter((c) => c.visible)
    .map((c) => ({
      argumentos: c.argumentos,
      salidaEsperadaTexto: serializarCanonico(
        c.salidaEsperada,
        problema.tipoRetorno,
      ),
    }))

  function handleLenguajeChange(nuevoLenguaje: LenguajeProgramacion) {
    setLenguaje(nuevoLenguaje)
    const config = lenguajes.find((l) => l.lenguaje === nuevoLenguaje)
    setCodigo(config?.codigoInicial ?? '')
  }

  function handleAceptarResuelto() {
    if (siguiente) {
      navigate({
        to: '/problemas/$problemaId',
        params: { problemaId: siguiente.id },
      })
    } else {
      navigate({ to: '/problemas' })
    }
  }

  const errorEjecucion = ejecutar.data?.error ?? null
  const resultadosEjecucion = !errorEjecucion
    ? (ejecutar.data?.resultados ?? null)
    : null
  const hint = ejecutar.data?.hint ?? null

  return (
    <div className="mx-auto max-w-[1320px] p-6 font-sans">
      <div className="mb-6 flex items-center justify-between">
        {anterior ? (
          <Link
            to="/problemas/$problemaId"
            params={{ problemaId: anterior.id }}
            className={NAV_ARROW_BUTTON}
            aria-label="Problema anterior"
            title={anterior.titulo}
          >
            ←
          </Link>
        ) : (
          <span className="w-9" />
        )}
        {indice >= 0 && (
          <span className={`${LOGRO_TEXT_NEUTRO} text-[11px] whitespace-nowrap`}>
            ✦ Problema {indice + 1} de {listaProblemas.length} ✦
          </span>
        )}
        {siguiente ? (
          <Link
            to="/problemas/$problemaId"
            params={{ problemaId: siguiente.id }}
            className={NAV_ARROW_BUTTON}
            aria-label="Siguiente problema"
            title={siguiente.titulo}
          >
            →
          </Link>
        ) : (
          <span className="w-9" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-8 items-start">
        <div>
          <div className="mb-4">
            <Link to="/problemas" className={BUTTON_TERMINAL_NAV}>
              Volver a la lista de problemas
            </Link>
          </div>
          <ProblemDescription
            titulo={problema.titulo}
            descripcion={problema.descripcion}
            dificultad={problema.dificultad}
            categoriaProblema={problema.categoriaProblema}
            ejemplos={ejemplos}
            resuelto={resuelto}
          />
        </div>
        <div>
          {/* Altura acotada al viewport (menos navbar + nav de problema
           * anterior/siguiente de arriba) para que "Ejecutar"/"Preguntar a
           * Haiku" queden siempre visibles sin necesidad de scroll; el
           * editor es el único que crece/encoge (flex-1 min-h-0). */}
          <CornerFrame
            borderClassName="border-[oklch(40%_0.1_150/0.5)]"
            className="flex h-[calc(100vh-11rem)] min-h-[420px] flex-col"
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-[oklch(40%_0.1_150/0.5)] bg-[oklch(8%_0.02_152)] shadow-2xl shadow-black/30">
              <div className="flex items-center justify-between gap-3 border-b border-[oklch(40%_0.1_150/0.5)] bg-[oklch(12%_0.02_150)] px-4 py-2">
                <span className="font-mono text-xs text-[oklch(45%_0.1_148)]">
                  problema.{lenguaje}
                </span>
                <select
                  className="rounded-sm border border-[oklch(40%_0.1_150/0.5)] bg-[oklch(12%_0.02_150)] px-2.5 py-1 font-mono text-[12.5px] text-[oklch(78%_0.19_148)] outline-none"
                  value={lenguaje}
                  onChange={(e) =>
                    handleLenguajeChange(e.target.value as LenguajeProgramacion)
                  }
                >
                  {lenguajes.map((l) => (
                    <option key={l.lenguaje} value={l.lenguaje}>
                      {l.lenguaje}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-h-0 flex-1">
                <CodeEditor
                  lenguaje={lenguaje}
                  value={codigo}
                  onChange={setCodigo}
                />
              </div>
              <div className="flex flex-wrap gap-2.5 border-t border-[oklch(40%_0.1_150/0.5)] bg-[oklch(12%_0.02_150)] px-4 py-3">
                <LoadingButton
                  className={BUTTON_TERMINAL_RUN}
                  onClick={() => ejecutar.mutate()}
                  isPending={ejecutar.isPending}
                  label="▶ Ejecutar"
                  pendingLabel="Ejecutando..."
                />
                {user && user.categoria === 'invitado' && (
                  <button
                    className={BUTTON_TERMINAL_ASSIST}
                    onClick={() => setMostrarAsistente(true)}
                  >
                    Preguntar a Haiku
                  </button>
                )}
              </div>
            </div>
          </CornerFrame>
          {errorEjecucion && (
            <p className="mt-4 text-sm text-red-600">{errorEjecucion}</p>
          )}
          {!errorEjecucion && resultadosEjecucion && (
            <RunResults results={resultadosEjecucion} hint={hint} />
          )}
          {mostrarAsistente && user && (
            <AssistantModal
              problemaId={problemaId}
              preguntasUsadas={user.preguntasIaUsadas}
              onClose={() => setMostrarAsistente(false)}
            />
          )}
        </div>
      </div>
      {sesiones && sesiones.activas > 1 && (
        <SesionesMultiplesModal sesionesActivas={sesiones.activas} />
      )}
      {ejecutar.data?.resuelto && (
        <ProblemSolvedModal
          duracionMinutos={ejecutar.data.resuelto.duracionMinutos}
          puntos={ejecutar.data.resuelto.puntos}
          onAceptar={handleAceptarResuelto}
        />
      )}
    </div>
  )
}
