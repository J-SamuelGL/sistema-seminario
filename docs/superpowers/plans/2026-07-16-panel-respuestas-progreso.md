# Panel de respuestas y seguimiento de progreso — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el flujo de "Submit" por auto-guardado en "Run", y reconstruir `/admin/envios`
como `/admin/respuestas`: una lista de participantes con su progreso agrupados por categoría, y una
vista de detalle por participante donde el admin puede revisar y cambiar el estado de cada problema.

**Architecture:** `envios` pasa de "una fila por intento" a "una fila por (usuario, problema)" con un
nuevo campo `estadoProgreso` (pendiente/completado/aprobado_manual) que determina el conteo de
resueltos. `corridas` se amplía para guardar el snapshot del último `Run` de cualquier categoría
(código/lenguaje/veredicto/resultados/timestamp), lo que permite reconstruir el progreso de un
participante aunque nunca haya acertado. Tres disparadores escriben en `envios`: un `Run` aceptado
(automático, solo la primera vez), un cambio manual del admin, y el cierre del torneo (que persiste
el último intento de todo el que llegó a correr algo).

**Tech Stack:** TanStack Start (React 19, SSR), Drizzle ORM/MySQL, Zod, TanStack Query, Vitest.

## Global Constraints

- Todo el código, identificadores, columnas/tablas de la base de datos, mensajes de commit y nombres
  de ramas van en español (ver CLAUDE.md).
- No probar comportamiento de UI vía automatización de navegador — lo hace el usuario manualmente.
- La base de datos actual es de prueba: el cambio de esquema se aplica con `npx drizzle-kit push`
  sin necesidad de preservar filas existentes.
- Spec de referencia: `docs/superpowers/specs/2026-07-16-panel-respuestas-progreso-design.md`.

---

## Task 1: Esquema de base de datos y eliminación del flujo anterior de envíos

El cambio de esquema (quitar `veredictoOriginal`/`comentarioClaude` de `envios`, agregar
`estadoProgreso` y la restricción única) rompe la compilación de todo lo que lee esas columnas
(`admin-submissions.ts`, las rutas `/admin/envios/*`, `SubmitResult.tsx`, `submit.ts`,
`aprobacion.ts`). Como ese flujo completo va a ser reemplazado, este task hace ambas cosas juntas
para que el repo compile de principio a fin: cambia el esquema y elimina de una vez todo lo que
dependía de las columnas viejas. El nuevo panel `/admin/respuestas` se construye en tasks
posteriores.

**Files:**
- Modify: `src/server/db/schema.ts`
- Delete: `src/server/envios/aprobacion.ts`
- Delete: `tests/envios-aprobacion.test.ts`
- Delete: `src/server/functions/admin-submissions.ts`
- Delete: `src/server/queries/envios.ts`
- Delete: `src/routes/admin/envios/index.tsx`
- Delete: `src/routes/admin/envios/$envioId.tsx`
- Delete: `src/server/functions/submit.ts`
- Delete: `src/components/SubmitResult.tsx`
- Modify: `src/routes/_app/problemas/$problemaId.tsx`
- Modify: `src/components/NavbarAdmin.tsx`

**Interfaces:**
- Produces: `envios` (mysqlTable) con columnas `id, usuarioId, problemaId, codigo, lenguaje, estado,
  estadoProgreso ('pendiente'|'completado'|'aprobado_manual'), resultados, aprobadoPorId, aprobadoEn,
  creadoEn`, y restricción única `envios_usuario_problema_unico` sobre `(usuarioId, problemaId)`.
  `corridas` con columnas nuevas `ultimoCodigo, ultimoLenguaje, ultimoVeredicto, ultimosResultados,
  ultimaEjecucionEn` (todas nullable).

- [ ] **Step 1: Modificar la tabla `envios` en el esquema**

En `src/server/db/schema.ts`, reemplaza la definición completa de `envios`:

```ts
export const envios = mysqlTable(
  'envios',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    usuarioId: varchar('usuario_id', { length: 36 })
      .notNull()
      .references(() => usuarios.id),
    problemaId: varchar('problema_id', { length: 36 })
      .notNull()
      .references(() => problemas.id),
    codigo: text('codigo').notNull(),
    lenguaje: text('lenguaje').notNull(),
    estado: mysqlEnum('estado', [
      'pendiente',
      'aceptado',
      'respuesta_incorrecta',
      'error_ejecucion',
      'tiempo_excedido',
    ])
      .notNull()
      .default('pendiente'),
    estadoProgreso: mysqlEnum('estado_progreso', ['pendiente', 'completado', 'aprobado_manual'])
      .notNull()
      .default('pendiente'),
    resultados: json('resultados').$type<ResultadoCaso[]>(),
    aprobadoPorId: varchar('aprobado_por_id', { length: 36 }).references(() => usuarios.id, {
      onDelete: 'set null',
    }),
    aprobadoEn: timestamp('aprobado_en'),
    creadoEn: timestamp('creado_en').notNull().defaultNow(),
  },
  (table) => [unique('envios_usuario_problema_unico').on(table.usuarioId, table.problemaId)],
)
```

- [ ] **Step 2: Ampliar la tabla `corridas` en el esquema**

En el mismo archivo, reemplaza la definición completa de `corridas`:

```ts
export const corridas = mysqlTable(
  'corridas',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    usuarioId: varchar('usuario_id', { length: 36 })
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    problemaId: varchar('problema_id', { length: 36 })
      .notNull()
      .references(() => problemas.id, { onDelete: 'cascade' }),
    contador: int('contador').notNull().default(0),
    ultimoCodigo: text('ultimo_codigo'),
    ultimoLenguaje: text('ultimo_lenguaje'),
    ultimoVeredicto: mysqlEnum('ultimo_veredicto', [
      'pendiente',
      'aceptado',
      'respuesta_incorrecta',
      'error_ejecucion',
      'tiempo_excedido',
    ]),
    ultimosResultados: json('ultimos_resultados').$type<ResultadoCaso[]>(),
    ultimaEjecucionEn: timestamp('ultima_ejecucion_en'),
  },
  (table) => [unique('corridas_usuario_problema_unico').on(table.usuarioId, table.problemaId)],
)
```

- [ ] **Step 3: Aplicar el esquema a la base de datos local**

Run: `npx drizzle-kit push`

Sigue las confirmaciones interactivas (aceptar quitar `veredicto_original`/`comentario_claude` de
`envios` y agregar las columnas nuevas). Si `DATABASE_URL` no apunta a una base local corriendo,
anota este paso como pendiente para el humano y continúa — no bloquea el resto del task, que es
puramente de código.

- [ ] **Step 4: Eliminar el flujo de aprobación anterior**

```bash
rm src/server/envios/aprobacion.ts
rm tests/envios-aprobacion.test.ts
rm src/server/functions/admin-submissions.ts
rm src/server/queries/envios.ts
rm src/routes/admin/envios/index.tsx
rm src/routes/admin/envios/\$envioId.tsx
rm src/server/functions/submit.ts
rm src/components/SubmitResult.tsx
rmdir src/routes/admin/envios
```

- [ ] **Step 5: Quitar el botón "Submit" de la página de resolución de problemas**

Reemplaza el contenido completo de `src/routes/_app/problemas/$problemaId.tsx`:

```tsx
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ejecutarCodigo } from '#/server/functions/run'
import { problemaQueryOptions } from '#/server/queries/problemas'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'
import { ProblemDescription } from '#/components/ProblemDescription'
import { CodeEditor } from '#/components/CodeEditor'
import { RunResults } from '#/components/RunResults'
import { AssistantModal } from '#/components/AssistantModal'
import { Spinner } from '#/components/Spinner'
import { serializarCanonico } from '#/server/judge/serializar'
import type { LenguajeProgramacion } from '#/server/envios/validar'

export const Route = createFileRoute('/_app/problemas/$problemaId')({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(problemaQueryOptions(params.problemaId)),
      context.queryClient.ensureQueryData(usuarioActualOpcionalQueryOptions()),
    ]),
  component: ProblemDetailPage,
})

function ProblemDetailPage() {
  const { problemaId } = Route.useParams()
  const { data: datosProblema } = useSuspenseQuery(problemaQueryOptions(problemaId))
  const { data: user } = useSuspenseQuery(usuarioActualOpcionalQueryOptions())
  const { problema, casosPrueba, lenguajes } = datosProblema
  const [lenguaje, setLenguaje] = useState<LenguajeProgramacion>(lenguajes[0]?.lenguaje ?? 'python')
  const [codigo, setCodigo] = useState(lenguajes[0]?.codigoInicial ?? '')
  const [mostrarAsistente, setMostrarAsistente] = useState(false)

  const ejecutar = useMutation({
    mutationFn: () => ejecutarCodigo({ data: { problemaId, lenguaje, codigo } }),
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  })

  if (!problema) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold">Problema no encontrado</h1>
        <p className="text-red-600">No existe un problema con el id "{problemaId}".</p>
      </div>
    )
  }

  const ejemplos = casosPrueba
    .filter((c) => c.visible)
    .map((c) => ({ argumentos: c.argumentos, salidaEsperadaTexto: serializarCanonico(c.salidaEsperada, problema.tipoRetorno) }))

  function handleLenguajeChange(nuevoLenguaje: LenguajeProgramacion) {
    setLenguaje(nuevoLenguaje)
    const config = lenguajes.find((l) => l.lenguaje === nuevoLenguaje)
    setCodigo(config?.codigoInicial ?? '')
  }

  const errorEjecucion = ejecutar.data?.error ?? null
  const resultadosEjecucion = !errorEjecucion ? (ejecutar.data?.resultados ?? null) : null
  const hint = ejecutar.data?.hint ?? null

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <ProblemDescription titulo={problema.titulo} descripcion={problema.descripcion} dificultad={problema.dificultad} ejemplos={ejemplos} />
      <div>
        <select
          className="border p-2"
          value={lenguaje}
          onChange={(e) => handleLenguajeChange(e.target.value as LenguajeProgramacion)}
        >
          {lenguajes.map((l) => (
            <option key={l.lenguaje} value={l.lenguaje}>
              {l.lenguaje}
            </option>
          ))}
        </select>
        <CodeEditor lenguaje={lenguaje} value={codigo} onChange={setCodigo} />
        <button
          className="mt-2 rounded bg-gray-700 px-4 py-2 text-white disabled:bg-gray-300"
          onClick={() => ejecutar.mutate()}
          disabled={ejecutar.isPending}
        >
          {ejecutar.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner /> Ejecutando...
            </span>
          ) : (
            'Run'
          )}
        </button>
        {errorEjecucion && <p className="mt-4 text-red-600">{errorEjecucion}</p>}
        {!errorEjecucion && resultadosEjecucion && <RunResults results={resultadosEjecucion} hint={hint} />}
        {user && user.categoria === 'invitado' && (
          <button className="mt-2 ml-2 rounded bg-purple-600 px-4 py-2 text-white" onClick={() => setMostrarAsistente(true)}>
            Preguntar a Haiku
          </button>
        )}
        {mostrarAsistente && user && (
          <AssistantModal problemaId={problemaId} preguntasUsadas={user.preguntasIaUsadas} onClose={() => setMostrarAsistente(false)} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Quitar el enlace roto de la navbar de admin**

En `src/components/NavbarAdmin.tsx`, quita la línea `{ to: '/admin/envios', etiqueta: 'Envíos' },`
del array `ENLACES` (Task 8 agrega el enlace nuevo a `/admin/respuestas`).

- [ ] **Step 7: Regenerar las rutas y verificar que el proyecto compila**

```bash
npm run generate-routes
npx tsc --noEmit
```

Expected: ambos comandos terminan sin errores. Si `tsc` reporta errores fuera de los archivos de
este task, revisa que no haya quedado ninguna referencia a `veredictoOriginal`, `comentarioClaude`,
`enviarCodigo`, `obtenerEnvio`, `SubmitResult`, `aprobarEnvioManualmente`, `revertirAprobacion` o
`listarTodosLosEnvios` en el código (`grep -rn` por esos nombres en `src/`).

- [ ] **Step 8: Correr la suite de pruebas y confirmar que las que no dependen de esta base de datos siguen pasando**

Run: `npm run test`
Expected: las pruebas que no requieren `DATABASE_URL`/`PISTON_URL` pasan; las que sí lo requieren
(`tests/db.test.ts`, `tests/harness-*.test.ts`, `tests/judge.test.ts`, `tests/piston-*.test.ts`)
pasan solo si esos servicios están corriendo localmente — si no lo están, sus fallos son esperados
y no bloquean este task.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: reestructurar envios/corridas para progreso y quitar flujo de Submit"
```

---

## Task 2: Lógica pura de cambio manual de estado

**Files:**
- Create: `src/server/envios/progreso.ts`
- Test: `tests/envios-progreso.test.ts`

**Interfaces:**
- Consumes: `idSchema` from `src/server/validacion/comun.ts`.
- Produces: `estadoProgresoSchema` (Zod enum), `actualizarEstadoProgresoSchema` (Zod object),
  `EstadoProgreso` type, `ActualizarEstadoProgreso` type, `CamposActualizacionProgreso` type,
  `aplicarCambioEstadoManual(nuevoEstado: EstadoProgreso, adminId: string, ahora: Date,
  ultimaEjecucionEn: Date | null): CamposActualizacionProgreso` — usado por Task 7.

- [ ] **Step 1: Escribir las pruebas primero**

Create `tests/envios-progreso.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { aplicarCambioEstadoManual } from '../src/server/envios/progreso'

describe('aplicarCambioEstadoManual', () => {
  it('al marcar completado, usa el timestamp del último run como creadoEn', () => {
    const resultado = aplicarCambioEstadoManual(
      'completado',
      'admin-1',
      new Date('2026-07-16T12:00:00Z'),
      new Date('2026-07-16T11:45:00Z'),
    )
    expect(resultado).toEqual({
      estadoProgreso: 'completado',
      aprobadoPorId: 'admin-1',
      aprobadoEn: new Date('2026-07-16T12:00:00Z'),
      creadoEn: new Date('2026-07-16T11:45:00Z'),
    })
  })

  it('al marcar aprobado_manual sin ningún run previo, usa el momento actual como creadoEn', () => {
    const resultado = aplicarCambioEstadoManual(
      'aprobado_manual',
      'admin-1',
      new Date('2026-07-16T12:00:00Z'),
      null,
    )
    expect(resultado.creadoEn).toEqual(new Date('2026-07-16T12:00:00Z'))
  })

  it('al volver a pendiente, no incluye creadoEn', () => {
    const resultado = aplicarCambioEstadoManual(
      'pendiente',
      'admin-1',
      new Date('2026-07-16T12:00:00Z'),
      new Date('2026-07-16T11:45:00Z'),
    )
    expect(resultado).toEqual({
      estadoProgreso: 'pendiente',
      aprobadoPorId: 'admin-1',
      aprobadoEn: new Date('2026-07-16T12:00:00Z'),
    })
    expect('creadoEn' in resultado).toBe(false)
  })
})
```

- [ ] **Step 2: Correr las pruebas y confirmar que fallan**

Run: `npx vitest run tests/envios-progreso.test.ts`
Expected: FAIL — `Cannot find module '../src/server/envios/progreso'`

- [ ] **Step 3: Implementar `src/server/envios/progreso.ts`**

```ts
import { z } from 'zod'
import { idSchema } from '../validacion/comun'

export const estadoProgresoSchema = z.enum(['pendiente', 'completado', 'aprobado_manual'])
export type EstadoProgreso = z.infer<typeof estadoProgresoSchema>

export const actualizarEstadoProgresoSchema = z.object({
  usuarioId: idSchema,
  problemaId: idSchema,
  estadoProgreso: estadoProgresoSchema,
})
export type ActualizarEstadoProgreso = z.infer<typeof actualizarEstadoProgresoSchema>

export type CamposActualizacionProgreso = {
  estadoProgreso: EstadoProgreso
  aprobadoPorId: string
  aprobadoEn: Date
  creadoEn?: Date
}

export function aplicarCambioEstadoManual(
  nuevoEstado: EstadoProgreso,
  adminId: string,
  ahora: Date,
  ultimaEjecucionEn: Date | null,
): CamposActualizacionProgreso {
  if (nuevoEstado === 'pendiente') {
    return { estadoProgreso: nuevoEstado, aprobadoPorId: adminId, aprobadoEn: ahora }
  }
  return {
    estadoProgreso: nuevoEstado,
    aprobadoPorId: adminId,
    aprobadoEn: ahora,
    creadoEn: ultimaEjecucionEn ?? ahora,
  }
}
```

- [ ] **Step 4: Correr las pruebas y confirmar que pasan**

Run: `npx vitest run tests/envios-progreso.test.ts`
Expected: PASS (3 pruebas)

- [ ] **Step 5: Commit**

```bash
git add src/server/envios/progreso.ts tests/envios-progreso.test.ts
git commit -m "feat: agregar lógica pura de cambio manual de estado de progreso"
```

---

## Task 3: Reescribir `calcularClasificacion` para el nuevo modelo de progreso

**Files:**
- Modify: `src/server/standings/calculate.ts`
- Modify: `tests/standings.test.ts`

**Interfaces:**
- Produces: `RegistroEnvio = { usuarioId: string; problemaId: string; estadoProgreso: 'pendiente' |
  'completado' | 'aprobado_manual'; creadoEn: Date }` (reemplaza el campo `estado` anterior),
  `calcularClasificacion(usuarios: RegistroUsuario[], envios: RegistroEnvio[], problemas:
  RegistroProblema[], torneoIniciadoEn: Date): FilaClasificacion[]` — usado por Task 7.
  `agruparClasificacionPorCategoria` sin cambios de firma.

- [ ] **Step 1: Actualizar las pruebas al nuevo modelo primero**

Reemplaza el contenido completo de `tests/standings.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calcularClasificacion, agruparClasificacionPorCategoria } from '../src/server/standings/calculate'

const start = new Date('2026-07-13T10:00:00Z')
const problemas = [
  { id: 'p1', puntos: 10 },
  { id: 'p2', puntos: 20 },
]

describe('calcularClasificacion', () => {
  it('returns zero solved and zero points for a user with no envios', () => {
    const filas = calcularClasificacion([{ id: 'u1', nombre: 'Ana', categoria: 'senior' }], [], problemas, start)
    expect(filas).toEqual([
      { usuarioId: 'u1', nombre: 'Ana', categoria: 'senior', cantidadResueltos: 0, puntosTotales: 0, minutosPenalizacionTotal: 0 },
    ])
  })

  it('counts a completado envio as solved, sums its points, and applies time penalty', () => {
    const filas = calcularClasificacion(
      [{ id: 'u1', nombre: 'Ana', categoria: 'senior' }],
      [{ usuarioId: 'u1', problemaId: 'p1', estadoProgreso: 'completado', creadoEn: new Date('2026-07-13T10:10:00Z') }],
      problemas,
      start,
    )
    expect(filas[0].cantidadResueltos).toBe(1)
    expect(filas[0].puntosTotales).toBe(10)
    expect(filas[0].minutosPenalizacionTotal).toBe(10)
  })

  it('counts an aprobado_manual envio the same as completado', () => {
    const filas = calcularClasificacion(
      [{ id: 'u1', nombre: 'Ana', categoria: 'senior' }],
      [{ usuarioId: 'u1', problemaId: 'p1', estadoProgreso: 'aprobado_manual', creadoEn: new Date('2026-07-13T10:20:00Z') }],
      problemas,
      start,
    )
    expect(filas[0].cantidadResueltos).toBe(1)
    expect(filas[0].puntosTotales).toBe(10)
    expect(filas[0].minutosPenalizacionTotal).toBe(20)
  })

  it('does not count a pendiente envio as solved', () => {
    const filas = calcularClasificacion(
      [{ id: 'u1', nombre: 'Ana', categoria: 'senior' }],
      [{ usuarioId: 'u1', problemaId: 'p1', estadoProgreso: 'pendiente', creadoEn: new Date('2026-07-13T10:05:00Z') }],
      problemas,
      start,
    )
    expect(filas[0].cantidadResueltos).toBe(0)
    expect(filas[0].puntosTotales).toBe(0)
  })

  it('sums multiple solved problems for the same user', () => {
    const filas = calcularClasificacion(
      [{ id: 'u1', nombre: 'Ana', categoria: 'senior' }],
      [
        { usuarioId: 'u1', problemaId: 'p1', estadoProgreso: 'completado', creadoEn: new Date('2026-07-13T10:10:00Z') },
        { usuarioId: 'u1', problemaId: 'p2', estadoProgreso: 'completado', creadoEn: new Date('2026-07-13T10:30:00Z') },
      ],
      problemas,
      start,
    )
    expect(filas[0].cantidadResueltos).toBe(2)
    expect(filas[0].puntosTotales).toBe(30)
    expect(filas[0].minutosPenalizacionTotal).toBe(10 + 30)
  })

  it('sorts by total points desc, then penalty asc — not by solved count', () => {
    const filas = calcularClasificacion(
      [
        { id: 'u1', nombre: 'Ana', categoria: 'senior' },
        { id: 'u2', nombre: 'Beto', categoria: 'senior' },
      ],
      [
        { usuarioId: 'u1', problemaId: 'p2', estadoProgreso: 'completado', creadoEn: new Date('2026-07-13T10:30:00Z') },
        { usuarioId: 'u2', problemaId: 'p1', estadoProgreso: 'completado', creadoEn: new Date('2026-07-13T10:05:00Z') },
      ],
      problemas,
      start,
    )
    expect(filas.map((f) => f.usuarioId)).toEqual(['u1', 'u2'])
  })
})

describe('agruparClasificacionPorCategoria', () => {
  it('separa las filas en invitado, junior y senior', () => {
    const agrupado = agruparClasificacionPorCategoria([
      { usuarioId: 'u1', nombre: 'Ana', categoria: 'senior', cantidadResueltos: 1, puntosTotales: 10, minutosPenalizacionTotal: 5 },
      { usuarioId: 'u2', nombre: 'Beto', categoria: 'junior', cantidadResueltos: 0, puntosTotales: 0, minutosPenalizacionTotal: 0 },
      { usuarioId: 'u3', nombre: 'Cata', categoria: 'invitado', cantidadResueltos: 0, puntosTotales: 0, minutosPenalizacionTotal: 0 },
    ])
    expect(agrupado.senior.map((f) => f.usuarioId)).toEqual(['u1'])
    expect(agrupado.junior.map((f) => f.usuarioId)).toEqual(['u2'])
    expect(agrupado.invitado.map((f) => f.usuarioId)).toEqual(['u3'])
  })
})
```

- [ ] **Step 2: Correr las pruebas y confirmar que fallan**

Run: `npx vitest run tests/standings.test.ts`
Expected: FAIL — los casos con `estadoProgreso` no coinciden con la implementación actual (que
espera `estado` y aplica penalización por intentos fallidos).

- [ ] **Step 3: Reescribir la implementación**

Reemplaza el contenido completo de `src/server/standings/calculate.ts`:

```ts
export type RegistroEnvio = {
  usuarioId: string
  problemaId: string
  estadoProgreso: 'pendiente' | 'completado' | 'aprobado_manual'
  creadoEn: Date
}

export type RegistroUsuario = {
  id: string
  nombre: string
  categoria: 'invitado' | 'junior' | 'senior'
}

export type RegistroProblema = { id: string; puntos: number }

export type FilaClasificacion = {
  usuarioId: string
  nombre: string
  categoria: 'invitado' | 'junior' | 'senior'
  cantidadResueltos: number
  puntosTotales: number
  minutosPenalizacionTotal: number
}

export function calcularClasificacion(
  usuarios: RegistroUsuario[],
  envios: RegistroEnvio[],
  problemas: RegistroProblema[],
  torneoIniciadoEn: Date,
): FilaClasificacion[] {
  const puntosPorProblema = new Map(problemas.map((p) => [p.id, p.puntos]))

  const resueltosPorUsuario = new Map<string, RegistroEnvio[]>()
  for (const e of envios) {
    if (e.estadoProgreso === 'pendiente') continue
    if (!resueltosPorUsuario.has(e.usuarioId)) resueltosPorUsuario.set(e.usuarioId, [])
    resueltosPorUsuario.get(e.usuarioId)!.push(e)
  }

  const filas = usuarios.map((usuario): FilaClasificacion => {
    const resueltos = resueltosPorUsuario.get(usuario.id) ?? []

    let cantidadResueltos = 0
    let puntosTotales = 0
    let minutosPenalizacionTotal = 0

    for (const envio of resueltos) {
      cantidadResueltos += 1
      puntosTotales += puntosPorProblema.get(envio.problemaId) ?? 0
      const minutosDesdeInicio = Math.floor(
        (envio.creadoEn.getTime() - torneoIniciadoEn.getTime()) / 60000,
      )
      minutosPenalizacionTotal += minutosDesdeInicio
    }

    return {
      usuarioId: usuario.id,
      nombre: usuario.nombre,
      categoria: usuario.categoria,
      cantidadResueltos,
      puntosTotales,
      minutosPenalizacionTotal,
    }
  })

  return filas.sort((a, b) => {
    if (b.puntosTotales !== a.puntosTotales) return b.puntosTotales - a.puntosTotales
    return a.minutosPenalizacionTotal - b.minutosPenalizacionTotal
  })
}

export function agruparClasificacionPorCategoria(filas: FilaClasificacion[]) {
  return {
    invitado: filas.filter((f) => f.categoria === 'invitado'),
    junior: filas.filter((f) => f.categoria === 'junior'),
    senior: filas.filter((f) => f.categoria === 'senior'),
  }
}
```

- [ ] **Step 4: Correr las pruebas y confirmar que pasan**

Run: `npx vitest run tests/standings.test.ts`
Expected: PASS (7 pruebas)

- [ ] **Step 5: Actualizar el consumidor existente (`leaderboard.ts`)**

`src/server/functions/leaderboard.ts` todavía arma `RegistroEnvio` con el campo `estado` viejo.
Ábrelo y reemplaza el bloque que mapea `todosEnvios`:

```ts
  const filas = calcularClasificacion(
    usuariosElegibles,
    todosEnvios.map((e) => ({
      usuarioId: e.usuarioId,
      problemaId: e.problemaId,
      estadoProgreso: e.estadoProgreso,
      creadoEn: e.creadoEn,
    })),
    problemasConPuntos,
    estado.iniciadoEn,
  )
```

(El único cambio es `estado: e.estado` → `estadoProgreso: e.estadoProgreso`.)

- [ ] **Step 6: Verificar que el proyecto compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/server/standings/calculate.ts tests/standings.test.ts src/server/functions/leaderboard.ts
git commit -m "feat: calcular clasificación a partir de estadoProgreso sin penalización por intentos"
```

---

## Task 4: Cálculo de duración por problema

**Files:**
- Create: `src/server/standings/duracion.ts`
- Test: `tests/standings-duracion.test.ts`

**Interfaces:**
- Produces: `RegistroResuelto = { problemaId: string; creadoEn: Date }`, `FilaDuracion = {
  problemaId: string; duracionMinutos: number }`, `calcularDuraciones(resueltos: RegistroResuelto[],
  torneoIniciadoEn: Date): FilaDuracion[]` — usado por Task 7.

- [ ] **Step 1: Escribir las pruebas primero**

Create `tests/standings-duracion.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calcularDuraciones } from '../src/server/standings/duracion'

const start = new Date('2026-07-16T09:00:00Z')

describe('calcularDuraciones', () => {
  it('returns an empty list when nothing was solved', () => {
    expect(calcularDuraciones([], start)).toEqual([])
  })

  it('duration of the first solved problem is measured from tournament start', () => {
    const filas = calcularDuraciones(
      [{ problemaId: 'p1', creadoEn: new Date('2026-07-16T09:15:00Z') }],
      start,
    )
    expect(filas).toEqual([{ problemaId: 'p1', duracionMinutos: 15 }])
  })

  it('duration of later problems is measured from the previous solve, not tournament start', () => {
    const filas = calcularDuraciones(
      [
        { problemaId: 'p1', creadoEn: new Date('2026-07-16T09:15:00Z') },
        { problemaId: 'p2', creadoEn: new Date('2026-07-16T09:40:00Z') },
      ],
      start,
    )
    expect(filas).toEqual([
      { problemaId: 'p1', duracionMinutos: 15 },
      { problemaId: 'p2', duracionMinutos: 25 },
    ])
  })

  it('orders by when each problem was actually solved, not by list order', () => {
    const filas = calcularDuraciones(
      [
        { problemaId: 'p2', creadoEn: new Date('2026-07-16T09:40:00Z') },
        { problemaId: 'p1', creadoEn: new Date('2026-07-16T09:15:00Z') },
      ],
      start,
    )
    expect(filas).toEqual([
      { problemaId: 'p1', duracionMinutos: 15 },
      { problemaId: 'p2', duracionMinutos: 25 },
    ])
  })
})
```

- [ ] **Step 2: Correr las pruebas y confirmar que fallan**

Run: `npx vitest run tests/standings-duracion.test.ts`
Expected: FAIL — `Cannot find module '../src/server/standings/duracion'`

- [ ] **Step 3: Implementar `src/server/standings/duracion.ts`**

```ts
export type RegistroResuelto = {
  problemaId: string
  creadoEn: Date
}

export type FilaDuracion = {
  problemaId: string
  duracionMinutos: number
}

export function calcularDuraciones(
  resueltos: RegistroResuelto[],
  torneoIniciadoEn: Date,
): FilaDuracion[] {
  const ordenados = resueltos.slice().sort((a, b) => a.creadoEn.getTime() - b.creadoEn.getTime())

  const filas: FilaDuracion[] = []
  let ultimoTimestamp = torneoIniciadoEn
  for (const resuelto of ordenados) {
    const duracionMinutos = Math.floor(
      (resuelto.creadoEn.getTime() - ultimoTimestamp.getTime()) / 60000,
    )
    filas.push({ problemaId: resuelto.problemaId, duracionMinutos })
    ultimoTimestamp = resuelto.creadoEn
  }

  return filas
}
```

- [ ] **Step 4: Correr las pruebas y confirmar que pasan**

Run: `npx vitest run tests/standings-duracion.test.ts`
Expected: PASS (4 pruebas)

- [ ] **Step 5: Commit**

```bash
git add src/server/standings/duracion.ts tests/standings-duracion.test.ts
git commit -m "feat: agregar cálculo de duración por problema resuelto"
```

---

## Task 5: `Run` guarda el snapshot de progreso y auto-crea el envio al acertar

No hay pruebas automatizadas dedicadas a `run.ts` en este repo (igual que `submit.ts` antes de este
plan): depende de `getRequest()`/sesión y de Piston real, así que se verifica con `tsc` y con las
pruebas de integración existentes que si tocan esta ruta.

**Files:**
- Modify: `src/server/functions/run.ts`

**Interfaces:**
- Consumes: `corridas`, `envios`, `estadoTorneo` from `src/server/db/schema.ts`; `asegurarIniciado`
  from `src/server/tournament/guard.ts`.

- [ ] **Step 1: Reemplazar `src/server/functions/run.ts` completo**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { problemas, casosPrueba, problemaLenguajes, corridas, envios, estadoTorneo } from '../db/schema'
import { requerirParticipanteIngresado } from '../auth/middleware'
import { ejecutarCasosPrueba } from '../judge/runTestCases'
import { ocultarDetalleCasosNoVisibles } from '../judge/resultadoPublico'
import { debeMostrarHint } from '../judge/hintCadence'
import { generarComentarioEnvio } from '../claude/feedback'
import { asegurarIniciado } from '../tournament/guard'
import { datosEjecucionSchema } from '../envios/validar'
import type { ResultadoCasoPublico } from '../judge/resultadoPublico'

export const ejecutarCodigo = createServerFn({ method: 'POST' })
  .validator(datosEjecucionSchema)
  .handler(
    async ({
      data,
    }): Promise<{ resultados: ResultadoCasoPublico[]; error: string | null; hint: string | null }> => {
      const request = getRequest()
      const user = await requerirParticipanteIngresado(request.headers)

      const filasEstado = await db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))
      const estado = filasEstado.length > 0 ? filasEstado[0] : null
      asegurarIniciado(estado ?? { iniciadoEn: null, finalizadoEn: null })

      const rows = await db.select().from(problemas).where(eq(problemas.id, data.problemaId))
      const problema = rows.length > 0 ? rows[0] : null
      if (!problema) throw new Error('Problema no encontrado')

      const filasLenguaje = await db
        .select()
        .from(problemaLenguajes)
        .where(and(eq(problemaLenguajes.problemaId, data.problemaId), eq(problemaLenguajes.lenguaje, data.lenguaje)))
      const filaLenguaje = filasLenguaje.length > 0 ? filasLenguaje[0] : null
      if (!filaLenguaje) throw new Error('Lenguaje no habilitado para este problema')

      const casos = await db.select().from(casosPrueba).where(eq(casosPrueba.problemaId, data.problemaId))

      try {
        const { resultados, veredicto } = await ejecutarCasosPrueba(
          data.lenguaje,
          data.codigo,
          { nombreFuncion: filaLenguaje.nombreFuncion, parametros: problema.parametros, tipoRetorno: problema.tipoRetorno },
          casos.map((c) => ({ argumentos: c.argumentos, salidaEsperada: c.salidaEsperada, visible: c.visible })),
        )
        const resultadosPublicos = ocultarDetalleCasosNoVisibles(resultados)
        const ahora = new Date()

        await db
          .insert(corridas)
          .values({
            usuarioId: user.id,
            problemaId: data.problemaId,
            contador: 1,
            ultimoCodigo: data.codigo,
            ultimoLenguaje: data.lenguaje,
            ultimoVeredicto: veredicto,
            ultimosResultados: resultados,
            ultimaEjecucionEn: ahora,
          })
          .onDuplicateKeyUpdate({
            set: {
              contador: sql`${corridas.contador} + 1`,
              ultimoCodigo: data.codigo,
              ultimoLenguaje: data.lenguaje,
              ultimoVeredicto: veredicto,
              ultimosResultados: resultados,
              ultimaEjecucionEn: ahora,
            },
          })

        if (veredicto === 'aceptado') {
          const filasEnvio = await db
            .select()
            .from(envios)
            .where(and(eq(envios.usuarioId, user.id), eq(envios.problemaId, data.problemaId)))
          if (filasEnvio.length === 0) {
            await db.insert(envios).values({
              usuarioId: user.id,
              problemaId: data.problemaId,
              codigo: data.codigo,
              lenguaje: data.lenguaje,
              estado: veredicto,
              estadoProgreso: 'completado',
              resultados,
              creadoEn: ahora,
            })
          }
        }

        let hint: string | null = null
        if (user.categoria === 'invitado') {
          try {
            const filasCorrida = await db
              .select()
              .from(corridas)
              .where(and(eq(corridas.usuarioId, user.id), eq(corridas.problemaId, data.problemaId)))
            const contador = filasCorrida.length > 0 ? filasCorrida[0].contador : 1

            if (debeMostrarHint(contador)) {
              const salidaError = resultados.find((r) => r.visible && r.salidaError)?.salidaError ?? ''
              hint = await generarComentarioEnvio({
                tituloProblema: problema.titulo,
                descripcionProblema: problema.descripcion,
                codigo: data.codigo,
                veredicto,
                salidaError,
              })
            }
          } catch (err) {
            console.error('No se pudo generar el hint de Claude', err)
            hint = null
          }
        }

        return { resultados: resultadosPublicos, error: null, hint }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return {
          resultados: [],
          error: `No se pudo ejecutar el código. Intenta de nuevo. (${message})`,
          hint: null,
        }
      }
    },
  )
```

Cambios respecto a la versión anterior: (1) valida `asegurarIniciado` antes de calificar; (2) el
upsert de `corridas` con el snapshot completo corre para **todas** las categorías, no solo
`invitado`; (3) si el veredicto es `aceptado` y no existe todavía un `envio` para ese par
usuario+problema, se crea automáticamente con `estadoProgreso: 'completado'`.

- [ ] **Step 2: Verificar que el proyecto compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Correr la suite de pruebas**

Run: `npm run test`
Expected: las pruebas que no dependen de MySQL/Piston reales siguen en verde. No se agregan pruebas
nuevas en este task (mismo criterio que `submit.ts`/`tournament.ts` en el resto del repo: la lógica
DB-dependiente de los server functions no tiene pruebas unitarias dedicadas, solo la lógica pura que
ya se cubrió en los Tasks 2–4).

- [ ] **Step 4: Commit**

```bash
git add src/server/functions/run.ts
git commit -m "feat: Run guarda snapshot de progreso y auto-crea envio al acertar"
```

---

## Task 6: `concluirTorneo` guarda el progreso pendiente de todos

**Files:**
- Modify: `src/server/functions/tournament.ts`

**Interfaces:**
- Consumes: `corridas`, `envios` from `src/server/db/schema.ts`.

- [ ] **Step 1: Reemplazar `src/server/functions/tournament.ts` completo**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { estadoTorneo, corridas, envios } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import { asegurarNoIniciado, asegurarIniciado } from '../tournament/guard'

export const obtenerEstadoTorneo = createServerFn({ method: 'GET' }).handler(async () => {
  const rows = await db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))
  const estado = rows.length > 0 ? rows[0] : null
  return estado ?? { id: 1, iniciadoEn: null, finalizadoEn: null }
})

export const iniciarTorneo = createServerFn({ method: 'POST' }).handler(async () => {
  const request = getRequest()
  await requerirAdmin(request.headers)

  const rows = await db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))
  const existente = rows.length > 0 ? rows[0] : null
  asegurarNoIniciado(existente ?? { iniciadoEn: null })

  const iniciadoEn = new Date()
  await db
    .insert(estadoTorneo)
    .values({ id: 1, iniciadoEn })
    .onDuplicateKeyUpdate({ set: { iniciadoEn } })

  return { iniciadoEn }
})

export const concluirTorneo = createServerFn({ method: 'POST' }).handler(async () => {
  const request = getRequest()
  await requerirAdmin(request.headers)

  const rows = await db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))
  const existente = rows.length > 0 ? rows[0] : null
  asegurarIniciado(existente ?? { iniciadoEn: null, finalizadoEn: null })

  const finalizadoEn = new Date()
  await db.update(estadoTorneo).set({ finalizadoEn }).where(eq(estadoTorneo.id, 1))

  await guardarProgresoPendiente(finalizadoEn)

  return { finalizadoEn }
})

async function guardarProgresoPendiente(finalizadoEn: Date) {
  const todasLasCorridas = await db.select().from(corridas)
  const enviosExistentes = await db
    .select({ usuarioId: envios.usuarioId, problemaId: envios.problemaId })
    .from(envios)
  const clavesExistentes = new Set(enviosExistentes.map((e) => `${e.usuarioId}:${e.problemaId}`))

  for (const corrida of todasLasCorridas) {
    const clave = `${corrida.usuarioId}:${corrida.problemaId}`
    if (clavesExistentes.has(clave)) continue

    await db.insert(envios).values({
      usuarioId: corrida.usuarioId,
      problemaId: corrida.problemaId,
      codigo: corrida.ultimoCodigo ?? '',
      lenguaje: corrida.ultimoLenguaje ?? '',
      estado: corrida.ultimoVeredicto ?? 'pendiente',
      estadoProgreso: 'pendiente',
      resultados: corrida.ultimosResultados,
      creadoEn: corrida.ultimaEjecucionEn ?? finalizadoEn,
    })
  }
}
```

`guardarProgresoPendiente` inserta un `envio` en `pendiente` (con el último código conocido) para
cada par usuario+problema que tiene una fila en `corridas` pero todavía ninguna en `envios` — es
decir, todo lo que alguien llegó a correr pero nunca acertó ni fue aprobado manualmente antes de que
terminara el torneo.

- [ ] **Step 2: Verificar que el proyecto compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Correr la suite de pruebas**

Run: `npm run test`
Expected: sin regresiones (mismo criterio del Task 5 — sin pruebas dedicadas a `tournament.ts`).

- [ ] **Step 4: Commit**

```bash
git add src/server/functions/tournament.ts
git commit -m "feat: concluirTorneo guarda el progreso pendiente de todos los participantes"
```

---

## Task 7: Funciones de servidor para el panel de respuestas

**Files:**
- Create: `src/server/functions/admin-respuestas.ts`
- Create: `src/server/queries/respuestas.ts`

**Interfaces:**
- Consumes: `calcularClasificacion`, `agruparClasificacionPorCategoria`, `RegistroUsuario`,
  `RegistroEnvio`, `RegistroProblema` from Task 3; `calcularDuraciones` from Task 4;
  `aplicarCambioEstadoManual`, `actualizarEstadoProgresoSchema` from Task 2; `grupoDeCategoria` from
  `src/server/problems/grupo.ts`; `idSchema` from `src/server/validacion/comun.ts`.
- Produces: `listarParticipantesConProgreso()`, `obtenerProgresoParticipante(usuarioId: string)`,
  `actualizarEstadoProgreso({ usuarioId, problemaId, estadoProgreso })` server functions, y
  `participantesConProgresoQueryOptions()`, `progresoParticipanteQueryOptions(usuarioId: string)`
  query options — usados por Task 8.

No hay pruebas dedicadas para este archivo (mismo criterio de `participantes.ts`/`leaderboard.ts`:
son wrappers `createServerFn` sobre DB real + sesión). La lógica de negocio que sí es testeable ya
está cubierta en `calcularClasificacion`, `calcularDuraciones` y `aplicarCambioEstadoManual`.

- [ ] **Step 1: Crear `src/server/functions/admin-respuestas.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios, envios, problemas, estadoTorneo, corridas } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import { calcularClasificacion, agruparClasificacionPorCategoria } from '../standings/calculate'
import { calcularDuraciones } from '../standings/duracion'
import { grupoDeCategoria } from '../problems/grupo'
import { aplicarCambioEstadoManual, actualizarEstadoProgresoSchema } from '../envios/progreso'
import { idSchema } from '../validacion/comun'
import type { RegistroUsuario, RegistroEnvio, RegistroProblema } from '../standings/calculate'

async function cargarDatosClasificacion() {
  const filasEstado = await db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))
  const torneoIniciadoEn = filasEstado.length > 0 ? filasEstado[0].iniciadoEn : null

  const [todosUsuarios, todosEnvios, todosProblemas] = await Promise.all([
    db.select().from(usuarios),
    db.select().from(envios),
    db.select().from(problemas),
  ])

  const usuariosElegibles: RegistroUsuario[] = todosUsuarios
    .filter((u) => u.rol === 'participante')
    .map((u) => ({ id: u.id, nombre: u.name, categoria: u.categoria }))

  const registrosEnvios: RegistroEnvio[] = todosEnvios.map((e) => ({
    usuarioId: e.usuarioId,
    problemaId: e.problemaId,
    estadoProgreso: e.estadoProgreso,
    creadoEn: e.creadoEn,
  }))

  const registrosProblemas: RegistroProblema[] = todosProblemas.map((p) => ({ id: p.id, puntos: p.puntos }))

  const clasificacion = calcularClasificacion(
    usuariosElegibles,
    registrosEnvios,
    registrosProblemas,
    torneoIniciadoEn ?? new Date(),
  )

  return { clasificacion, todosUsuarios, todosProblemas, torneoIniciadoEn }
}

export const listarParticipantesConProgreso = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  await requerirAdmin(request.headers)

  const { clasificacion, todosUsuarios, todosProblemas } = await cargarDatosClasificacion()

  const totalPorGrupo = {
    invitado_junior: todosProblemas.filter((p) => p.grupo === 'invitado_junior').length,
    senior: todosProblemas.filter((p) => p.grupo === 'senior').length,
  }

  const asistieron = new Set(
    todosUsuarios.filter((u) => u.rol === 'participante' && u.ingresadoEn !== null).map((u) => u.id),
  )

  const agrupado = agruparClasificacionPorCategoria(clasificacion.filter((f) => asistieron.has(f.usuarioId)))

  return (['invitado', 'junior', 'senior'] as const).flatMap((categoria) =>
    agrupado[categoria].map((fila, i) => ({
      usuarioId: fila.usuarioId,
      nombre: fila.nombre,
      categoria: fila.categoria,
      cantidadCompletados: fila.cantidadResueltos,
      cantidadPendientes: totalPorGrupo[grupoDeCategoria(fila.categoria)] - fila.cantidadResueltos,
      puntosTotales: fila.puntosTotales,
      puesto: i + 1,
    })),
  )
})

export const obtenerProgresoParticipante = createServerFn({ method: 'GET' })
  .validator(idSchema)
  .handler(async ({ data: usuarioId }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const filasUsuario = await db.select().from(usuarios).where(eq(usuarios.id, usuarioId))
    const usuario = filasUsuario.length > 0 ? filasUsuario[0] : null
    if (!usuario) throw new Error('Participante no encontrado')

    const { clasificacion, torneoIniciadoEn } = await cargarDatosClasificacion()
    const clasificacionCategoria = clasificacion.filter((f) => f.categoria === usuario.categoria)
    const indice = clasificacionCategoria.findIndex((f) => f.usuarioId === usuarioId)
    const filaClasificacion = indice >= 0 ? clasificacionCategoria[indice] : null

    const grupo = grupoDeCategoria(usuario.categoria)
    const [problemasDelGrupo, enviosDelUsuario, corridasDelUsuario] = await Promise.all([
      db.select().from(problemas).where(eq(problemas.grupo, grupo)).orderBy(problemas.orden),
      db.select().from(envios).where(eq(envios.usuarioId, usuarioId)),
      db.select().from(corridas).where(eq(corridas.usuarioId, usuarioId)),
    ])

    const envioPorProblema = new Map(enviosDelUsuario.map((e) => [e.problemaId, e]))
    const corridaPorProblema = new Map(corridasDelUsuario.map((c) => [c.problemaId, c]))

    const resueltos = enviosDelUsuario
      .filter((e) => e.estadoProgreso !== 'pendiente')
      .map((e) => ({ problemaId: e.problemaId, creadoEn: e.creadoEn }))
    const duraciones = new Map(
      calcularDuraciones(resueltos, torneoIniciadoEn ?? new Date()).map((d) => [d.problemaId, d.duracionMinutos]),
    )

    const problemasConEstado = problemasDelGrupo.map((p) => {
      const envio = envioPorProblema.get(p.id)
      const corrida = corridaPorProblema.get(p.id)
      return {
        problemaId: p.id,
        titulo: p.titulo,
        dificultad: p.dificultad,
        categoriaProblema: p.categoriaProblema,
        estadoProgreso: envio?.estadoProgreso ?? ('pendiente' as const),
        creadoEn: envio?.creadoEn ?? null,
        duracionMinutos: duraciones.get(p.id) ?? null,
        codigo: envio?.codigo ?? corrida?.ultimoCodigo ?? null,
        lenguaje: envio?.lenguaje ?? corrida?.ultimoLenguaje ?? null,
        resultados: envio?.resultados ?? corrida?.ultimosResultados ?? null,
      }
    })

    return {
      participante: { id: usuario.id, nombre: usuario.name, categoria: usuario.categoria },
      puntosTotales: filaClasificacion?.puntosTotales ?? 0,
      puesto: indice >= 0 ? indice + 1 : null,
      problemas: problemasConEstado,
    }
  })

export const actualizarEstadoProgreso = createServerFn({ method: 'POST' })
  .validator(actualizarEstadoProgresoSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const admin = await requerirAdmin(request.headers)

    const filasCorrida = await db
      .select()
      .from(corridas)
      .where(and(eq(corridas.usuarioId, data.usuarioId), eq(corridas.problemaId, data.problemaId)))
    const corrida = filasCorrida.length > 0 ? filasCorrida[0] : null

    const campos = aplicarCambioEstadoManual(
      data.estadoProgreso,
      admin.id,
      new Date(),
      corrida?.ultimaEjecucionEn ?? null,
    )

    const filasEnvio = await db
      .select()
      .from(envios)
      .where(and(eq(envios.usuarioId, data.usuarioId), eq(envios.problemaId, data.problemaId)))
    const envioExistente = filasEnvio.length > 0 ? filasEnvio[0] : null

    if (envioExistente) {
      await db.update(envios).set(campos).where(eq(envios.id, envioExistente.id))
    } else {
      await db.insert(envios).values({
        usuarioId: data.usuarioId,
        problemaId: data.problemaId,
        codigo: corrida?.ultimoCodigo ?? '',
        lenguaje: corrida?.ultimoLenguaje ?? '',
        estado: corrida?.ultimoVeredicto ?? 'pendiente',
        resultados: corrida?.ultimosResultados,
        ...campos,
      })
    }
  })
```

- [ ] **Step 2: Crear `src/server/queries/respuestas.ts`**

```ts
import { queryOptions } from '@tanstack/react-query'
import { listarParticipantesConProgreso, obtenerProgresoParticipante } from '../functions/admin-respuestas'

export function participantesConProgresoQueryOptions() {
  return queryOptions({
    queryKey: ['respuestas'],
    queryFn: () => listarParticipantesConProgreso(),
    refetchInterval: 3000,
  })
}

export function progresoParticipanteQueryOptions(usuarioId: string) {
  return queryOptions({
    queryKey: ['respuestas', usuarioId],
    queryFn: () => obtenerProgresoParticipante({ data: usuarioId }),
    refetchInterval: 3000,
  })
}
```

- [ ] **Step 3: Verificar que el proyecto compila**

Run: `npx tsc --noEmit`
Expected: sin errores. Si `noUnusedLocals` marca algún import sin usar, quítalo.

- [ ] **Step 4: Commit**

```bash
git add src/server/functions/admin-respuestas.ts src/server/queries/respuestas.ts
git commit -m "feat: agregar funciones de servidor para el panel de respuestas"
```

---

## Task 8: Rutas de admin `/admin/respuestas`

**Files:**
- Create: `src/routes/admin/respuestas/index.tsx`
- Create: `src/routes/admin/respuestas/$usuarioId.tsx`
- Modify: `src/components/NavbarAdmin.tsx`

**Interfaces:**
- Consumes: `participantesConProgresoQueryOptions`, `progresoParticipanteQueryOptions` from Task 7;
  `actualizarEstadoProgreso` from Task 7.

- [ ] **Step 1: Crear la lista de participantes `src/routes/admin/respuestas/index.tsx`**

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { participantesConProgresoQueryOptions } from '#/server/queries/respuestas'

export const Route = createFileRoute('/admin/respuestas/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(participantesConProgresoQueryOptions()),
  component: AdminRespuestasPage,
})

const ETIQUETAS_CATEGORIA: Record<string, string> = {
  invitado: 'Invitado',
  junior: 'Junior',
  senior: 'Senior',
}

function AdminRespuestasPage() {
  const { data } = useSuspenseQuery(participantesConProgresoQueryOptions())

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Respuestas</h1>
      {(['invitado', 'junior', 'senior'] as const).map((categoria) => {
        const filas = data.filter((f) => f.categoria === categoria)
        if (filas.length === 0) return null
        return (
          <div key={categoria} className="mt-6">
            <h2 className="text-lg font-bold">{ETIQUETAS_CATEGORIA[categoria]}</h2>
            <table className="mt-2 w-full border-collapse text-left">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Puesto</th>
                  <th className="p-2">Nombre</th>
                  <th className="p-2">Completados</th>
                  <th className="p-2">Pendientes</th>
                  <th className="p-2">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.usuarioId} className="border-b">
                    <td className="p-2">{f.puesto}</td>
                    <td className="p-2">
                      <Link to="/admin/respuestas/$usuarioId" params={{ usuarioId: f.usuarioId }} className="text-blue-600 underline">
                        {f.nombre}
                      </Link>
                    </td>
                    <td className="p-2">{f.cantidadCompletados}</td>
                    <td className="p-2">{f.cantidadPendientes}</td>
                    <td className="p-2">{f.puntosTotales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Crear el detalle por participante `src/routes/admin/respuestas/$usuarioId.tsx`**

```tsx
import { Fragment, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { actualizarEstadoProgreso } from '#/server/functions/admin-respuestas'
import { participantesConProgresoQueryOptions, progresoParticipanteQueryOptions } from '#/server/queries/respuestas'
import { Spinner } from '#/components/Spinner'

export const Route = createFileRoute('/admin/respuestas/$usuarioId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(progresoParticipanteQueryOptions(params.usuarioId)),
  component: AdminRespuestaDetallePage,
})

const ETIQUETAS_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  completado: 'Completado',
  aprobado_manual: 'Aprobado manual',
}

function AdminRespuestaDetallePage() {
  const { usuarioId } = Route.useParams()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(progresoParticipanteQueryOptions(usuarioId))
  const [expandido, setExpandido] = useState<string | null>(null)

  const cambiarEstado = useMutation({
    mutationFn: (vars: { problemaId: string; estadoProgreso: 'pendiente' | 'completado' | 'aprobado_manual' }) =>
      actualizarEstadoProgreso({ data: { usuarioId, problemaId: vars.problemaId, estadoProgreso: vars.estadoProgreso } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: progresoParticipanteQueryOptions(usuarioId).queryKey })
      queryClient.invalidateQueries({ queryKey: participantesConProgresoQueryOptions().queryKey })
      toast.success('Estado actualizado.')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  })

  return (
    <div className="flex flex-col gap-4 p-8">
      <h1 className="text-xl font-bold">
        {data.participante.nombre} — {data.puntosTotales} pts — Puesto #{data.puesto ?? '—'}
      </h1>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b">
            <th className="p-2">Problema</th>
            <th className="p-2">Dificultad</th>
            <th className="p-2">Categoría</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Duración</th>
            <th className="p-2">Enviado en</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.problemas.map((p) => (
            <Fragment key={p.problemaId}>
              <tr className="border-b">
                <td className="p-2">
                  {p.codigo && (
                    <button
                      className="mr-2 text-blue-600 underline"
                      onClick={() => setExpandido(expandido === p.problemaId ? null : p.problemaId)}
                    >
                      {expandido === p.problemaId ? '▾' : '▸'}
                    </button>
                  )}
                  {p.titulo}
                </td>
                <td className="p-2">{p.dificultad}</td>
                <td className="p-2">{p.categoriaProblema}</td>
                <td className="p-2">{ETIQUETAS_ESTADO[p.estadoProgreso]}</td>
                <td className="p-2">{p.duracionMinutos !== null ? `${p.duracionMinutos} min` : '—'}</td>
                <td className="p-2">{p.creadoEn ? new Date(p.creadoEn).toLocaleString() : '—'}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <select
                      className="border p-1 text-sm"
                      value={p.estadoProgreso}
                      disabled={cambiarEstado.isPending}
                      onChange={(e) =>
                        cambiarEstado.mutate({
                          problemaId: p.problemaId,
                          estadoProgreso: e.target.value as 'pendiente' | 'completado' | 'aprobado_manual',
                        })
                      }
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="completado">Completado</option>
                      <option value="aprobado_manual">Aprobado manual</option>
                    </select>
                    {cambiarEstado.isPending && <Spinner />}
                  </div>
                </td>
              </tr>
              {expandido === p.problemaId && p.codigo && (
                <tr className="border-b bg-gray-50">
                  <td colSpan={7} className="p-2">
                    <p className="text-sm text-gray-600">Lenguaje: {p.lenguaje}</p>
                    <pre className="mt-1 whitespace-pre-wrap rounded bg-white p-2 text-sm">{p.codigo}</pre>
                    {p.resultados && (
                      <ul className="mt-2 flex flex-col gap-1 text-sm">
                        {p.resultados.map((r, i) => (
                          <li key={i}>
                            <code>{r.argumentos.map((a) => JSON.stringify(a)).join(', ')}</code> — Esperado:{' '}
                            <code>{r.salidaEsperada}</code> — Obtenido: <code>{r.salidaObtenida || r.salidaError}</code> —{' '}
                            {r.aprobado ? '✅' : '❌'}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Agregar el enlace de navegación**

En `src/components/NavbarAdmin.tsx`, agrega la entrada al array `ENLACES` (entre `'Problemas'` y
`'Clasificación'`, en el mismo lugar donde estaba `'Envíos'` antes del Task 1):

```ts
  { to: '/admin/respuestas', etiqueta: 'Respuestas' },
```

- [ ] **Step 4: Regenerar rutas y verificar que el proyecto compila**

```bash
npm run generate-routes
npx tsc --noEmit
```

Expected: sin errores. Confirma que `routeTree.gen.ts` incluye `/admin/respuestas/` y
`/admin/respuestas/$usuarioId`.

- [ ] **Step 5: Commit**

```bash
git add src/routes/admin/respuestas src/components/NavbarAdmin.tsx src/routeTree.gen.ts
git commit -m "feat: agregar panel /admin/respuestas con lista y detalle por participante"
```

---

## Task 9: Actualizar CLAUDE.md y verificación final

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Actualizar la sección de submissions**

En `CLAUDE.md`, reemplaza el párrafo que empieza con "Two server functions drive submissions..."
por:

```markdown
`src/server/functions/run.ts` (`ejecutarCodigo`) — único camino de calificación ("Run" es el único
botón; no existe "Submit"). Requiere que el torneo haya iniciado y no haya concluido
(`asegurarIniciado`). En cada corrida hace upsert de un snapshot (código/lenguaje/veredicto/
resultados/timestamp) en `corridas`, para cualquier categoría — esto es lo que permite reconstruir
el progreso de un participante aunque nunca haya acertado. Si el veredicto es `aceptado` y todavía
no existe un `envio` para ese usuario+problema, lo crea automáticamente con
`estadoProgreso: 'completado'`. Un admin puede además cambiar el `estadoProgreso` de cualquier
problema manualmente (`pendiente`/`completado`/`aprobado_manual`) desde `/admin/respuestas`
(`src/server/functions/admin-respuestas.ts`), y `concluirTorneo`
(`src/server/functions/tournament.ts`) persiste como `envio` en `pendiente` el último código
conocido de todo lo que alguien llegó a correr pero nunca acertó, para poder revisarlo después de
que el torneo termina.
```

Y reemplaza la frase sobre `feedback.ts` en la sección "Claude integration":

```markdown
- `src/server/claude/feedback.ts` — comentario/hint periódico cada 3 corridas de `Run`
  (`src/server/judge/hintCadence.ts`), basado en veredicto + stderr. Ya no se genera al enviar una
  respuesta (no existe ese flujo).
```

Y en la sección "Tournament lifecycle & scoring", reemplaza la frase sobre puntos y penalización:

```markdown
`src/server/standings/calculate.ts` computes the leaderboard: a problem counts as solved when its
`envio` has `estadoProgreso` `completado` (auto-detected by `Run`) or `aprobado_manual` (set by an
admin from `/admin/respuestas`); points come from the first (and only) such `envio` per problem per
user, with a penalty in minutes equal to the minutes since tournament start at the time it was
solved (no penalty for prior failed attempts). `src/server/standings/duracion.ts` computes, for the
admin-facing detail page, how long a participant took on each solved problem (relative to the
previous solve, or tournament start for the first one).
```

- [ ] **Step 2: Correr toda la suite de pruebas**

Run: `npm run test`
Expected: todas las pruebas que no dependen de MySQL/Piston reales pasan. Si `DATABASE_URL` y
`PISTON_URL` apuntan a servicios locales corriendo, `tests/db.test.ts`, `tests/harness-*.test.ts`,
`tests/judge.test.ts` y `tests/piston-*.test.ts` también deben pasar.

- [ ] **Step 3: Lint y formato**

```bash
npm run lint
npm run check
```

Expected: sin errores. Si `check` (prettier) reporta diferencias, corre `npm run format`.

- [ ] **Step 4: Typecheck final**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: actualizar CLAUDE.md con el nuevo flujo de progreso y respuestas"
```

- [ ] **Step 6: Checklist de verificación manual (el usuario la ejecuta, no automatizarla)**

Deja anotado para el usuario, ya que este proyecto no prueba UI vía automatización de navegador:

1. `npx drizzle-kit push` contra la base local (si no se hizo en el Task 1).
2. Iniciar el torneo, resolver un problema con `Run` hasta que dé `aceptado` → confirmar que
   aparece como "Completado" en `/admin/respuestas/$usuarioId` sin haber usado ningún botón
   "Submit" (ya no existe).
3. Desde `/admin/respuestas/$usuarioId`, cambiar el estado de un problema a "Aprobado manual" y
   confirmar que suma puntos en `/clasificacion`.
4. Correr `Run` con una solución incorrecta en un problema y no tocarlo más; concluir el torneo;
   confirmar que ese problema aparece en `/admin/respuestas/$usuarioId` como "Pendiente" pero con
   el código guardado y visible al expandir la fila.
5. Confirmar que `/admin/respuestas` agrupa correctamente por invitado/junior/senior y que los
   participantes sin check-in (`ingresadoEn` nulo) no aparecen.

---

## Self-Review

**Spec coverage:**
- Modelo de datos (`envios`/`corridas`) → Task 1.
- Run auto-crea envio al aceptar por primera vez, sin pisar overrides → Task 5.
- Cambio manual libre entre los 3 estados con `creadoEn` basado en el último run → Tasks 2, 7.
- Snapshot al concluir el torneo → Task 6.
- Puntaje sin penalización por intentos, resuelto = completado|aprobado_manual → Task 3.
- Duración por problema → Task 4.
- `/admin/respuestas` lista agrupada por categoría con completados/pendientes/puntos/puesto → Tasks
  7, 8.
- `/admin/respuestas/$usuarioId` con todos los problemas del grupo, estado, duración, timestamp,
  control de estado, código expandible → Tasks 7, 8.
- Quitar Submit y su feedback de Claude → Task 1.
- Renombrar navbar → Tasks 1, 8.
- Testing (calcularClasificacion, calcularDuraciones, disparadores de estado manual) → Tasks 2, 3,
  4; los disparadores DB-dependientes de `run.ts`/`tournament.ts` siguen el mismo criterio que el
  resto del repo (sin pruebas unitarias dedicadas, solo su lógica pura extraída).

**Placeholder scan:** sin TBD/TODO; todos los pasos incluyen código completo.

**Type consistency:** `EstadoProgreso`/`estadoProgreso` se usa consistentemente en
`schema.ts`, `progreso.ts`, `calculate.ts`, `admin-respuestas.ts` y las rutas. `RegistroEnvio` se
actualiza en su único otro consumidor (`leaderboard.ts`, Task 3 Step 5) para evitar romper la
compilación fuera de los archivos tocados directamente.
