# Navegación, TanStack Query y panel de administración — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar navegación por rol (navbar admin/participante + logout), integrar TanStack Query de forma canónica con TanStack Start, y cerrar los huecos del panel de administración (eliminar participante, CRUD de administradores, conectar eliminar problema, detalle de envío con aprobación manual/reversión de veredicto).

**Architecture:** `QueryClient` se crea una vez en `src/router.tsx` y se engancha vía `setupRouterSsrQueryIntegration` (que además envuelve automáticamente la app en `QueryClientProvider`, sin tocar `__root.tsx` más que tipar el contexto). Cada dato "en vivo" vive en un archivo de `queryOptions` bajo `src/server/queries/`, consumido por `loader` (`ensureQueryData`) + `useSuspenseQuery` en el componente, con `refetchInterval: 3000`. Los navbars son layout routes (`src/routes/admin/route.tsx` y `src/routes/_app/route.tsx`) que envuelven sus rutas hijas con `<Outlet />`.

**Tech Stack:** TanStack Start/Router/Query (`@tanstack/react-query` v5, `@tanstack/react-router-ssr-query`), Drizzle ORM/MySQL, better-auth, Vitest.

## Global Constraints

- Todo identificador de código, columna de base de datos, mensaje de commit y nombre de rama va en español (convención del proyecto).
- Todas las queries "en vivo" (clasificación, envíos, participantes, administradores, estado del usuario actual) usan `refetchInterval: 3000`.
- No se agrega automatización de navegador para probar UI — cada tarea con cambios de UI termina con una nota de verificación manual; el usuario la ejecuta.
- El navbar oculta enlaces según estado/rol pero no reemplaza la autorización real de los `createServerFn` (`requerirAdmin`/`requerirParticipanteIngresado`) — no se agregan guardas `beforeLoad`.
- Cambios de esquema se aplican con `npx drizzle-kit push` (no hay migraciones versionadas en este repo), requiere `DATABASE_URL` apuntando a una base local corriendo.

---

## Task 1: Instalar y configurar TanStack Query

**Files:**

- Modify: `package.json`
- Modify: `src/router.tsx`
- Modify: `src/routes/__root.tsx`

**Interfaces:**

- Produces: `router.tsx` exporta `getRouter()` con `context: { queryClient: QueryClient }` ya registrado — todas las tareas siguientes que definen `loader`s con `({ context }) => context.queryClient.ensureQueryData(...)` dependen de esto.

- [ ] **Step 1: Instalar la dependencia**

Run: `npm install @tanstack/react-query`

Expected: se agrega `"@tanstack/react-query": "^5.101.2"` (o superior) a `dependencies` en `package.json`, y `package-lock.json` se actualiza. El paquete ya estaba resuelto en `node_modules` como dependencia transitiva de `@tanstack/react-router-ssr-query`, así que la instalación debería ser casi instantánea.

- [ ] **Step 2: Enganchar el QueryClient en el router**

Reemplazar el contenido completo de `src/router.tsx`:

```tsx
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const queryClient = new QueryClient()

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    context: { queryClient },
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
```

`setupRouterSsrQueryIntegration` ya envuelve `router.options.Wrap` en `<QueryClientProvider>` internamente (ver `node_modules/@tanstack/react-router-ssr-query/dist/esm/index.js`) — no hace falta agregar el provider a mano en `__root.tsx`.

- [ ] **Step 3: Tipar el contexto del root route**

En `src/routes/__root.tsx`, cambiar el import y la declaración de `Route`:

```tsx
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'

import appCss from '../styles.css?url'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: 'Torneo de Programación' },
      ],
      links: [{ rel: 'stylesheet', href: appCss }],
    }),
    shellComponent: RootDocument,
  },
)
```

El resto del archivo (`RootDocument`) no cambia.

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: build exitoso sin errores de tipos (confirma que `context.queryClient` está bien tipado en toda la app).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/router.tsx src/routes/__root.tsx
git commit -m "feat: integrar TanStack Query con TanStack Start"
```

---

## Task 2: Migrar `/clasificacion` a TanStack Query

**Files:**

- Create: `src/server/queries/clasificacion.ts`
- Modify: `src/routes/clasificacion.tsx`

**Interfaces:**

- Consumes: `obtenerClasificacion` de `src/server/functions/leaderboard.ts` (sin cambios).
- Produces: `clasificacionQueryOptions()` — reutilizada en la Tarea 14 (navbar admin, como referencia de patrón) y por cualquier otra pantalla que necesite el leaderboard.

- [ ] **Step 1: Crear las query options**

Crear `src/server/queries/clasificacion.ts`:

```ts
import { queryOptions } from '@tanstack/react-query'
import { obtenerClasificacion } from '../functions/leaderboard'

export function clasificacionQueryOptions() {
  return queryOptions({
    queryKey: ['clasificacion'],
    queryFn: () => obtenerClasificacion(),
    refetchInterval: 3000,
  })
}
```

- [ ] **Step 2: Migrar la ruta**

Reemplazar el contenido completo de `src/routes/clasificacion.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { clasificacionQueryOptions } from '#/server/queries/clasificacion'
import { LeaderboardTable } from '#/components/LeaderboardTable'

export const Route = createFileRoute('/clasificacion')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(clasificacionQueryOptions()),
  component: LeaderboardPage,
})

function LeaderboardPage() {
  const { data } = useSuspenseQuery(clasificacionQueryOptions())

  if (!data.iniciado)
    return <p className="p-8">El torneo aún no ha comenzado.</p>

  return (
    <div className="grid grid-cols-3 gap-8 p-8">
      <LeaderboardTable title="Invitados" rows={data.invitado} />
      <LeaderboardTable title="Junior" rows={data.junior} />
      <LeaderboardTable title="Senior" rows={data.senior} />
    </div>
  )
}
```

(Confirma el resto del JSX original en `LeaderboardTable`/grid contra el archivo actual antes de reemplazar — el `useEffect`/`setInterval` manual desaparece por completo, `useSuspenseQuery` con `refetchInterval` lo reemplaza.)

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add src/server/queries/clasificacion.ts src/routes/clasificacion.tsx
git commit -m "refactor: migrar /clasificacion de polling manual a TanStack Query"
```

---

## Task 3: Migrar `/admin/envios` a TanStack Query

**Files:**

- Create: `src/server/queries/envios.ts`
- Modify: `src/routes/admin/envios.tsx`

**Interfaces:**

- Consumes: `listarTodosLosEnvios` de `src/server/functions/admin-submissions.ts` (sin cambios).
- Produces: `enviosQueryOptions()` — reutilizada en la Tarea 12 (para invalidar tras aprobar/revertir un envío).

- [ ] **Step 1: Crear las query options**

Crear `src/server/queries/envios.ts`:

```ts
import { queryOptions } from '@tanstack/react-query'
import { listarTodosLosEnvios } from '../functions/admin-submissions'

export function enviosQueryOptions() {
  return queryOptions({
    queryKey: ['envios'],
    queryFn: () => listarTodosLosEnvios(),
    refetchInterval: 3000,
  })
}
```

- [ ] **Step 2: Migrar la ruta**

Reemplazar el contenido completo de `src/routes/admin/envios.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { enviosQueryOptions } from '#/server/queries/envios'

export const Route = createFileRoute('/admin/envios')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(enviosQueryOptions()),
  component: AdminSubmissionsPage,
})

function AdminSubmissionsPage() {
  const { data: rows } = useSuspenseQuery(enviosQueryOptions())

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Envíos en vivo</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2 text-left">Hora</th>
            <th className="border p-2 text-left">Participante</th>
            <th className="border p-2 text-left">Problema</th>
            <th className="border p-2 text-left">Lenguaje</th>
            <th className="border p-2 text-left">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="border p-2">
                {new Date(row.creadoEn).toLocaleTimeString()}
              </td>
              <td className="border p-2">{row.nombreUsuario}</td>
              <td className="border p-2">{row.tituloProblema}</td>
              <td className="border p-2">{row.lenguaje}</td>
              <td className="border p-2">{row.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add src/server/queries/envios.ts src/routes/admin/envios.tsx
git commit -m "refactor: migrar /admin/envios de polling manual a TanStack Query"
```

---

## Task 4: `obtenerParticipantes` y lista en vivo en `/admin/participantes`

**Files:**

- Modify: `src/server/functions/participantes.ts`
- Create: `src/server/queries/participantes.ts`
- Modify: `src/routes/admin/participantes.tsx`

**Interfaces:**

- Produces: `obtenerParticipantes` (devuelve `{ id, nombre, correo, categoria, carnet, ingresadoEn, cantidadEnvios }[]`), `participantesQueryOptions()` — reutilizados en la Tarea 5 (botón eliminar) y también wireados en `/admin/ingreso` dentro de esta misma tarea (Step 4) para mostrar el conteo de check-in en vivo.

- [ ] **Step 1: Agregar el server function**

En `src/server/functions/participantes.ts`, agregar el import de `sql` y `envios`, y la nueva función al final del archivo:

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios, cuentas, envios } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import { crearCuentaParticipante } from '../participantes/crear'
import { generarContrasenaAleatoria } from '../auth/password'
import { enviarCorreoBienvenida } from '../email/brevo'
```

(Reemplaza los imports existentes al inicio del archivo por este bloque — agrega `sql` y `envios`.)

Al final del archivo:

```ts
export const obtenerParticipantes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const filas = await db
      .select({
        id: usuarios.id,
        nombre: usuarios.name,
        correo: usuarios.email,
        categoria: usuarios.categoria,
        carnet: usuarios.carnet,
        ingresadoEn: usuarios.ingresadoEn,
        cantidadEnvios: sql<number>`count(${envios.id})`,
      })
      .from(usuarios)
      .leftJoin(envios, eq(envios.usuarioId, usuarios.id))
      .where(eq(usuarios.rol, 'participante'))
      .groupBy(usuarios.id)

    return filas.map((f) => ({
      ...f,
      cantidadEnvios: Number(f.cantidadEnvios),
    }))
  },
)
```

- [ ] **Step 2: Crear las query options**

Crear `src/server/queries/participantes.ts`:

```ts
import { queryOptions } from '@tanstack/react-query'
import { obtenerParticipantes } from '../functions/participantes'

export function participantesQueryOptions() {
  return queryOptions({
    queryKey: ['participantes'],
    queryFn: () => obtenerParticipantes(),
    refetchInterval: 3000,
  })
}
```

- [ ] **Step 3: Agregar la lista en vivo a la pantalla**

En `src/routes/admin/participantes.tsx`, agregar imports y la tabla en vivo. El formulario de registro y la lista transitoria de "recién registrados en esta sesión" (con el fallback de contraseña si falla el correo) se quedan exactamente igual — se agrega una sección nueva debajo.

Agregar a los imports existentes:

```tsx
import { useSuspenseQuery } from '@tanstack/react-query'
import { participantesQueryOptions } from '#/server/queries/participantes'
```

Cambiar la declaración de la ruta para precargar la query:

```tsx
export const Route = createFileRoute('/admin/participantes')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(participantesQueryOptions()),
  component: AdminParticipantsPage,
})
```

Dentro de `AdminParticipantsPage`, después de `const [registrados, setRegistrados] = useState<ParticipanteRegistrado[]>([])`, agregar:

```tsx
const { data: participantes } = useSuspenseQuery(participantesQueryOptions())
```

Y al final del JSX, después del `</ul>` de la lista transitoria y antes del `</div>` de cierre, agregar la tabla en vivo:

```tsx
      <h2 className="text-lg font-bold">Todos los participantes registrados</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2 text-left">Nombre</th>
            <th className="border p-2 text-left">Correo</th>
            <th className="border p-2 text-left">Categoría</th>
            <th className="border p-2 text-left">Check-in</th>
            <th className="border p-2 text-left">Envíos</th>
          </tr>
        </thead>
        <tbody>
          {participantes.map((p) => (
            <tr key={p.id}>
              <td className="border p-2">{p.nombre}</td>
              <td className="border p-2">{p.correo}</td>
              <td className="border p-2">{p.categoria}</td>
              <td className="border p-2">{p.ingresadoEn ? '✅' : '—'}</td>
              <td className="border p-2">{p.cantidadEnvios}</td>
            </tr>
          ))}
        </tbody>
      </table>
```

- [ ] **Step 4: Mostrar el conteo de check-in en vivo en `/admin/ingreso`**

Reemplazar el contenido completo de `src/routes/admin/ingreso.tsx` para que también consuma `participantesQueryOptions()` — así una persona escaneada en otra estación aparece aquí sin recargar:

```tsx
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { QrScanner } from '#/components/QrScanner'
import { registrarIngresoPorToken } from '#/server/functions/checkin'
import { participantesQueryOptions } from '#/server/queries/participantes'
import type { ResultadoIngreso } from '#/server/checkin/result'

export const Route = createFileRoute('/admin/ingreso')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(participantesQueryOptions()),
  component: CheckinPage,
})

function CheckinPage() {
  const queryClient = useQueryClient()
  const { data: participantes } = useSuspenseQuery(participantesQueryOptions())
  const [ultimoResultado, setUltimoResultado] =
    useState<ResultadoIngreso | null>(null)
  const [error, setError] = useState<string | null>(null)

  const yaIngresados = participantes.filter((p) => p.ingresadoEn).length

  async function handleScan(token: string) {
    try {
      const resultado = await registrarIngresoPorToken({ data: token })
      setUltimoResultado(resultado)
      setError(null)
      queryClient.invalidateQueries({
        queryKey: participantesQueryOptions().queryKey,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h1 className="text-xl font-bold">Check-in</h1>
      <p className="text-sm text-gray-600">
        {yaIngresados} de {participantes.length} participantes ya hicieron
        check-in
      </p>
      <QrScanner onScan={handleScan} />
      {ultimoResultado?.status === 'ingresado' && (
        <p className="text-green-600">
          ✅ {ultimoResultado.nombreUsuario} presente
        </p>
      )}
      {ultimoResultado?.status === 'ya_ingresado' && (
        <p className="text-yellow-600">
          ⚠️ {ultimoResultado.nombreUsuario} ya había hecho check-in
        </p>
      )}
      {ultimoResultado?.status === 'no_encontrado' && (
        <p className="text-red-600">❌ Código no reconocido</p>
      )}
      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 5: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 6: Verificación manual**

Con `npm run dev` corriendo y un admin logueado, entra a `/admin/participantes` y confirma que la tabla "Todos los participantes registrados" muestra a los participantes ya sembrados por `scripts/seed-datos-prueba.ts` (si corriste ese script). Luego entra a `/admin/ingreso` y confirma que el contador "X de Y" coincide con cuántos ya tienen check-in.

- [ ] **Step 7: Commit**

```bash
git add src/server/functions/participantes.ts src/server/queries/participantes.ts src/routes/admin/participantes.tsx src/routes/admin/ingreso.tsx
git commit -m "feat: listar participantes en vivo en /admin/participantes y /admin/ingreso"
```

---

## Task 5: Eliminar participante

**Files:**

- Create: `src/server/participantes/eliminar.ts`
- Test: `tests/participantes-eliminar.test.ts`
- Modify: `src/server/functions/participantes.ts`
- Modify: `src/routes/admin/participantes.tsx`

**Interfaces:**

- Consumes: `usuarios`, `envios`, `preguntasIa` de `src/server/db/schema.ts`.
- Produces: `puedeEliminarParticipante(input)` (función pura, reutilizada por el botón de eliminar en el cliente y por el server function), `eliminarParticipante` server function.

- [ ] **Step 1: Escribir la función pura y su test (falla primero)**

Crear `src/server/participantes/eliminar.ts`:

```ts
export function puedeEliminarParticipante(input: {
  rol: 'participante' | 'admin'
  cantidadEnvios: number
}): { puede: true } | { puede: false; motivo: string } {
  if (input.rol !== 'participante') {
    return {
      puede: false,
      motivo: 'Solo se pueden eliminar cuentas de participante desde aquí.',
    }
  }
  if (input.cantidadEnvios > 0) {
    return {
      puede: false,
      motivo:
        'Este participante ya tiene envíos registrados; eliminarlo alteraría el leaderboard.',
    }
  }
  return { puede: true }
}
```

Crear `tests/participantes-eliminar.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { puedeEliminarParticipante } from '../src/server/participantes/eliminar'

describe('puedeEliminarParticipante', () => {
  it('permite eliminar a un participante sin envíos', () => {
    expect(
      puedeEliminarParticipante({ rol: 'participante', cantidadEnvios: 0 }),
    ).toEqual({
      puede: true,
    })
  })

  it('bloquea eliminar a un participante con envíos', () => {
    const resultado = puedeEliminarParticipante({
      rol: 'participante',
      cantidadEnvios: 3,
    })
    expect(resultado.puede).toBe(false)
  })

  it('bloquea eliminar una cuenta que no es de participante', () => {
    const resultado = puedeEliminarParticipante({
      rol: 'admin',
      cantidadEnvios: 0,
    })
    expect(resultado.puede).toBe(false)
  })
})
```

- [ ] **Step 2: Correr el test y confirmar que pasa**

Run: `npx vitest run tests/participantes-eliminar.test.ts`
Expected: 3 tests PASS (la función ya está completa arriba, no hay ciclo red-green separado porque es lógica pura trivial — igual se corre para confirmar).

- [ ] **Step 3: Agregar el server function**

Al final de `src/server/functions/participantes.ts`, agregar el import de `preguntasIa` (modificar la línea de import de schema para incluir `preguntasIa`) y la función:

```ts
import { usuarios, cuentas, envios, preguntasIa } from '../db/schema'
import { puedeEliminarParticipante } from '../participantes/eliminar'
```

```ts
export const eliminarParticipante = createServerFn({ method: 'POST' })
  .validator((usuarioId: string) => usuarioId)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const filas = await db.select().from(usuarios).where(eq(usuarios.id, data))
    const usuario = filas.length > 0 ? filas[0] : null
    if (!usuario) throw new Error('Participante no encontrado')

    const filasEnvios = await db
      .select()
      .from(envios)
      .where(eq(envios.usuarioId, data))
    const permiso = puedeEliminarParticipante({
      rol: usuario.rol,
      cantidadEnvios: filasEnvios.length,
    })
    if (!permiso.puede) throw new Error(permiso.motivo)

    await db.transaction(async (tx) => {
      await tx.delete(preguntasIa).where(eq(preguntasIa.usuarioId, data))
      await tx.delete(usuarios).where(eq(usuarios.id, data))
    })
  })
```

- [ ] **Step 4: Wire del botón en la UI**

En `src/routes/admin/participantes.tsx`, agregar imports:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eliminarParticipante } from '#/server/functions/participantes'
import { puedeEliminarParticipante } from '#/server/participantes/eliminar'
```

Dentro de `AdminParticipantsPage`, después de la línea `const { data: participantes } = useSuspenseQuery(participantesQueryOptions())`, agregar:

```tsx
const queryClient = useQueryClient()
const [errorEliminar, setErrorEliminar] = useState<string | null>(null)
const eliminar = useMutation({
  mutationFn: (usuarioId: string) => eliminarParticipante({ data: usuarioId }),
  onSuccess: () => {
    setErrorEliminar(null)
    queryClient.invalidateQueries({
      queryKey: participantesQueryOptions().queryKey,
    })
  },
  onError: (err) =>
    setErrorEliminar(err instanceof Error ? err.message : String(err)),
})
```

Reemplazar la fila `<tr key={p.id}>...</tr>` de la tabla en vivo (agregada en la Tarea 4) por:

```tsx
{
  participantes.map((p) => {
    const permiso = puedeEliminarParticipante({
      rol: 'participante',
      cantidadEnvios: p.cantidadEnvios,
    })
    return (
      <tr key={p.id}>
        <td className="border p-2">{p.nombre}</td>
        <td className="border p-2">{p.correo}</td>
        <td className="border p-2">{p.categoria}</td>
        <td className="border p-2">{p.ingresadoEn ? '✅' : '—'}</td>
        <td className="border p-2">{p.cantidadEnvios}</td>
        <td className="border p-2">
          <button
            className="text-red-600 underline disabled:text-gray-400 disabled:no-underline"
            disabled={!permiso.puede || eliminar.isPending}
            title={permiso.puede ? undefined : permiso.motivo}
            onClick={() => eliminar.mutate(p.id)}
          >
            Eliminar
          </button>
        </td>
      </tr>
    )
  })
}
```

Y agregar la columna de encabezado correspondiente en el `<thead>` de esa misma tabla:

```tsx
<th className="border p-2 text-left">Acciones</th>
```

Y mostrar `errorEliminar` debajo de la tabla:

```tsx
{
  errorEliminar && <p className="text-red-600">{errorEliminar}</p>
}
```

- [ ] **Step 5: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 6: Verificación manual**

Con la base de datos de prueba (`scripts/seed-datos-prueba.ts`), intenta eliminar un participante sin envíos (debe desaparecer de la lista) y confirma que el botón aparece deshabilitado con tooltip para uno que ya tiene envíos (envía primero un problema con ese usuario para probarlo).

- [ ] **Step 7: Commit**

```bash
git add src/server/participantes/eliminar.ts tests/participantes-eliminar.test.ts src/server/functions/participantes.ts src/routes/admin/participantes.tsx
git commit -m "feat: permitir eliminar participantes sin envíos"
```

---

## Task 6: Administradores — backend

**Files:**

- Modify: `src/server/participantes/crear.ts`
- Create: `src/server/functions/administradores.ts`
- Create: `src/server/queries/administradores.ts`

**Interfaces:**

- Produces: `crearCuentaParticipante` ahora acepta `rol?: 'participante' | 'admin'`; `obtenerAdministradores`, `registrarAdministrador`, `eliminarAdministrador`, `administradoresQueryOptions()` — usados por la Tarea 7 (pantalla).

- [ ] **Step 1: Generalizar `crearCuentaParticipante`**

En `src/server/participantes/crear.ts`, cambiar la firma y el insert:

```ts
export async function crearCuentaParticipante(input: {
  nombre: string
  correo: string
  categoria: 'invitado' | 'junior' | 'senior'
  carnet: string | null
  rol?: 'participante' | 'admin'
}): Promise<{ id: string; contrasenaGenerada: string }> {
  const existentes = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, input.correo))
  if (existentes.length > 0) {
    throw new Error('Ya existe una cuenta con ese correo')
  }

  const contrasenaGenerada = generarContrasenaAleatoria()
  const hash = await hashPassword(contrasenaGenerada)
  const id = crypto.randomUUID()

  await db.transaction(async (tx) => {
    await tx.insert(usuarios).values({
      id,
      name: input.nombre,
      email: input.correo,
      categoria: input.categoria,
      carnet: input.carnet,
      rol: input.rol ?? 'participante',
    })
    await tx.insert(cuentas).values({
      id: crypto.randomUUID(),
      userId: id,
      accountId: id,
      providerId: 'credential',
      password: hash,
    })
  })

  return { id, contrasenaGenerada }
}
```

- [ ] **Step 2: Crear los server functions de administradores**

Crear `src/server/functions/administradores.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import { crearCuentaParticipante } from '../participantes/crear'
import { enviarCorreoBienvenida } from '../email/brevo'

export const obtenerAdministradores = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    await requerirAdmin(request.headers)
    return db
      .select({
        id: usuarios.id,
        nombre: usuarios.name,
        correo: usuarios.email,
      })
      .from(usuarios)
      .where(eq(usuarios.rol, 'admin'))
  },
)

export const registrarAdministrador = createServerFn({ method: 'POST' })
  .validator((input: { nombre: string; correo: string }) => input)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const { id, contrasenaGenerada } = await crearCuentaParticipante({
      nombre: data.nombre,
      correo: data.correo,
      categoria: 'senior',
      carnet: null,
      rol: 'admin',
    })

    let correoEnviado = true
    try {
      await enviarCorreoBienvenida({
        nombre: data.nombre,
        correo: data.correo,
        contrasena: contrasenaGenerada,
      })
    } catch (err) {
      console.error('No se pudo enviar el correo de bienvenida', err)
      correoEnviado = false
    }

    return {
      id,
      nombre: data.nombre,
      correo: data.correo,
      correoEnviado,
      contrasenaGenerada,
    }
  })

export const eliminarAdministrador = createServerFn({ method: 'POST' })
  .validator((usuarioId: string) => usuarioId)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const filas = await db.select().from(usuarios).where(eq(usuarios.id, data))
    const usuario = filas.length > 0 ? filas[0] : null
    if (!usuario) throw new Error('Administrador no encontrado')
    if (usuario.rol !== 'admin')
      throw new Error('Esta cuenta no es de administrador')

    await db.delete(usuarios).where(eq(usuarios.id, data))
  })
```

- [ ] **Step 3: Crear las query options**

Crear `src/server/queries/administradores.ts`:

```ts
import { queryOptions } from '@tanstack/react-query'
import { obtenerAdministradores } from '../functions/administradores'

export function administradoresQueryOptions() {
  return queryOptions({
    queryKey: ['administradores'],
    queryFn: () => obtenerAdministradores(),
    refetchInterval: 3000,
  })
}
```

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
git add src/server/participantes/crear.ts src/server/functions/administradores.ts src/server/queries/administradores.ts
git commit -m "feat: agregar CRUD de administradores en el servidor"
```

---

## Task 7: Pantalla `/admin/administradores`

**Files:**

- Create: `src/routes/admin/administradores.tsx`

**Interfaces:**

- Consumes: `obtenerAdministradores`/`registrarAdministrador`/`eliminarAdministrador` (Tarea 6), `administradoresQueryOptions()` (Tarea 6).
- Produces: la ruta `/admin/administradores`, enlazada por `NavbarAdmin` en la Tarea 14.

- [ ] **Step 1: Crear la pantalla**

Crear `src/routes/admin/administradores.tsx`:

```tsx
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import {
  registrarAdministrador,
  eliminarAdministrador,
} from '#/server/functions/administradores'
import { administradoresQueryOptions } from '#/server/queries/administradores'

export const Route = createFileRoute('/admin/administradores')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(administradoresQueryOptions()),
  component: AdminAdministradoresPage,
})

function AdminAdministradoresPage() {
  const queryClient = useQueryClient()
  const { data: administradores } = useSuspenseQuery(
    administradoresQueryOptions(),
  )
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [credenciales, setCredenciales] = useState<{
    correoEnviado: boolean
    contrasenaGenerada: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const crear = useMutation({
    mutationFn: (input: { nombre: string; correo: string }) =>
      registrarAdministrador({ data: input }),
    onSuccess: (resultado) => {
      setCredenciales(resultado)
      setNombre('')
      setCorreo('')
      setError(null)
      queryClient.invalidateQueries({
        queryKey: administradoresQueryOptions().queryKey,
      })
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : String(err)),
  })

  const eliminar = useMutation({
    mutationFn: (usuarioId: string) =>
      eliminarAdministrador({ data: usuarioId }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: administradoresQueryOptions().queryKey,
      }),
    onError: (err) =>
      setError(err instanceof Error ? err.message : String(err)),
  })

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-xl font-bold">Administradores</h1>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          crear.mutate({ nombre, correo })
        }}
      >
        <input
          className="border p-2"
          placeholder="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
        <input
          className="border p-2"
          type="email"
          placeholder="Correo"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
        />
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:bg-gray-300"
          type="submit"
          disabled={crear.isPending}
        >
          {crear.isPending ? 'Registrando...' : 'Registrar administrador'}
        </button>
        {error && <p className="text-red-600">{error}</p>}
      </form>

      {credenciales && !credenciales.correoEnviado && (
        <p className="text-yellow-600">
          ⚠️ No se pudo enviar el correo — contraseña:{' '}
          {credenciales.contrasenaGenerada}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {administradores.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between border p-2"
          >
            <span>
              <strong>{a.nombre}</strong> — {a.correo}
            </span>
            <button
              className="text-red-600 underline disabled:text-gray-400"
              disabled={eliminar.isPending}
              onClick={() => eliminar.mutate(a.id)}
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso. `npm run generate-routes` puede correr automáticamente vía el plugin de Vite en `npm run dev`; si `npm run build` se queja de que la ruta no está registrada en `routeTree.gen.ts`, correr `npm run generate-routes` manualmente antes de repetir el build.

- [ ] **Step 3: Verificación manual**

Con `npm run dev`, navega a `/admin/administradores` (aún sin enlace en ningún navbar — se agrega en la Tarea 14), registra un admin de prueba y confirma que aparece en la lista y que se puede eliminar.

- [ ] **Step 4: Commit**

```bash
git add src/routes/admin/administradores.tsx src/routeTree.gen.ts
git commit -m "feat: agregar pantalla /admin/administradores"
```

---

## Task 8: Conectar el botón "Eliminar problema"

**Files:**

- Modify: `src/routes/admin/problemas/$problemaId.tsx`

**Interfaces:**

- Consumes: `eliminarProblema` de `src/server/functions/problems.ts` (ya existe, sin cambios).

- [ ] **Step 1: Agregar el handler y el botón**

En `src/routes/admin/problemas/$problemaId.tsx`, cambiar el import:

```tsx
import {
  obtenerProblema,
  crearProblema,
  actualizarProblema,
  eliminarProblema,
} from '#/server/functions/problems'
```

Dentro de `AdminProblemEditPage`, después de `handleSubmit`, agregar:

```tsx
async function handleDelete() {
  if (
    !window.confirm(
      '¿Eliminar este problema? Se borran también sus casos de prueba y su configuración de lenguajes.',
    )
  )
    return
  await eliminarProblema({ data: problemaId })
  await navigate({ to: '/admin/problemas' })
}
```

Cambiar el `return` final para envolver el formulario y agregar el botón (solo cuando no es un problema nuevo):

```tsx
return (
  <div>
    {problemaId !== 'new' && (
      <button
        className="m-4 rounded bg-red-600 px-4 py-2 text-white"
        onClick={handleDelete}
      >
        Eliminar problema
      </button>
    )}
    <AdminProblemForm initial={initial} onSubmit={handleSubmit} />
  </div>
)
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Verificación manual**

Crea un problema de prueba desde `/admin/problemas/new`, ábrelo y confirma que "Eliminar problema" lo borra y regresa a `/admin/problemas`.

- [ ] **Step 4: Commit**

```bash
git add src/routes/admin/problemas/\$problemaId.tsx
git commit -m "feat: conectar el botón de eliminar problema"
```

---

## Task 9: Esquema de `envios` (resultados y auditoría de aprobación) + persistir `resultados`

**Files:**

- Modify: `src/server/db/schema.ts`
- Modify: `src/server/functions/submit.ts`

**Interfaces:**

- Produces: columnas `envios.resultados`, `envios.veredictoOriginal`, `envios.aprobadoPorId`, `envios.aprobadoEn` — consumidas por las Tareas 10-12.

- [ ] **Step 1: Agregar las columnas al esquema**

En `src/server/db/schema.ts`, agregar el import de `ResultadoCaso` junto al de `Parametro, Valor`:

```ts
import type { Parametro, Valor } from '../judge/tipos'
import type { ResultadoCaso } from '../judge/verdict'
```

Reemplazar la definición de `envios` por:

```ts
export const envios = mysqlTable('envios', {
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
  resultados: json('resultados').$type<ResultadoCaso[]>(),
  veredictoOriginal: mysqlEnum('veredicto_original', [
    'pendiente',
    'aceptado',
    'respuesta_incorrecta',
    'error_ejecucion',
    'tiempo_excedido',
  ]),
  aprobadoPorId: varchar('aprobado_por_id', { length: 36 }).references(
    () => usuarios.id,
  ),
  aprobadoEn: timestamp('aprobado_en'),
  comentarioClaude: text('comentario_claude'),
  creadoEn: timestamp('creado_en').notNull().defaultNow(),
})
```

- [ ] **Step 2: Aplicar el cambio a la base de datos**

Run: `npx drizzle-kit push`
Expected: el CLI muestra las 4 columnas nuevas de `envios` y pide confirmación (usualmente flechas + Enter para "Yes, I want to execute all statements"); confirma. Requiere `DATABASE_URL` apuntando a MySQL local corriendo.

- [ ] **Step 3: Persistir `resultados` al calificar un envío**

En `src/server/functions/submit.ts`, cambiar la línea:

```ts
await db.update(envios).set({ estado: veredicto }).where(eq(envios.id, envioId))
```

por:

```ts
await db
  .update(envios)
  .set({ estado: veredicto, resultados })
  .where(eq(envios.id, envioId))
```

(`resultados` ya está en scope — es la variable desestructurada de `ejecutarCasosPrueba` un poco más arriba en la misma función.)

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 5: Correr la suite completa**

Run: `npm run test`
Expected: todos los tests existentes siguen en verde (el cambio de esquema no afecta la lógica pura de harness/judge/standings; `tests/judge.test.ts` no inserta en `envios` directamente).

- [ ] **Step 6: Commit**

```bash
git add src/server/db/schema.ts src/server/functions/submit.ts
git commit -m "feat: persistir resultados detallados por caso en cada envío"
```

---

## Task 10: Aprobación manual — funciones puras y tests

**Files:**

- Create: `src/server/envios/aprobacion.ts`
- Test: `tests/envios-aprobacion.test.ts`

**Interfaces:**

- Produces: `aplicarAprobacionManual(envio, adminId, ahora)`, `revertirAprobacionEnvio(envio)` — consumidas por los server functions de la Tarea 11.

- [ ] **Step 1: Escribir el test (falla primero)**

Crear `tests/envios-aprobacion.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  aplicarAprobacionManual,
  revertirAprobacionEnvio,
} from '../src/server/envios/aprobacion'

describe('aplicarAprobacionManual', () => {
  it('guarda el veredicto original la primera vez que se aprueba', () => {
    const resultado = aplicarAprobacionManual(
      { estado: 'respuesta_incorrecta', veredictoOriginal: null },
      'admin-1',
      new Date('2026-07-15T10:00:00Z'),
    )
    expect(resultado).toEqual({
      estado: 'aceptado',
      veredictoOriginal: 'respuesta_incorrecta',
      aprobadoPorId: 'admin-1',
      aprobadoEn: new Date('2026-07-15T10:00:00Z'),
    })
  })

  it('no pisa el veredicto original si ya estaba aprobado manualmente', () => {
    const resultado = aplicarAprobacionManual(
      { estado: 'aceptado', veredictoOriginal: 'error_ejecucion' },
      'admin-2',
      new Date('2026-07-15T11:00:00Z'),
    )
    expect(resultado.veredictoOriginal).toBe('error_ejecucion')
  })
})

describe('revertirAprobacionEnvio', () => {
  it('restaura el veredicto original y limpia los campos de auditoría', () => {
    const resultado = revertirAprobacionEnvio({
      veredictoOriginal: 'tiempo_excedido',
    })
    expect(resultado).toEqual({
      estado: 'tiempo_excedido',
      veredictoOriginal: null,
      aprobadoPorId: null,
      aprobadoEn: null,
    })
  })

  it('lanza un error si el envío no fue aprobado manualmente', () => {
    expect(() => revertirAprobacionEnvio({ veredictoOriginal: null })).toThrow()
  })
})
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `npx vitest run tests/envios-aprobacion.test.ts`
Expected: FAIL con "Cannot find module '../src/server/envios/aprobacion'".

- [ ] **Step 3: Implementar las funciones**

Crear `src/server/envios/aprobacion.ts`:

```ts
import type { Veredicto } from '../judge/verdict'

export type EstadoEnvio = 'pendiente' | Veredicto

export type CamposAprobacion = {
  estado: EstadoEnvio
  veredictoOriginal: EstadoEnvio | null
  aprobadoPorId: string | null
  aprobadoEn: Date | null
}

export function aplicarAprobacionManual(
  envio: { estado: EstadoEnvio; veredictoOriginal: EstadoEnvio | null },
  adminId: string,
  ahora: Date,
): CamposAprobacion {
  return {
    estado: 'aceptado',
    veredictoOriginal: envio.veredictoOriginal ?? envio.estado,
    aprobadoPorId: adminId,
    aprobadoEn: ahora,
  }
}

export function revertirAprobacionEnvio(envio: {
  veredictoOriginal: EstadoEnvio | null
}): CamposAprobacion {
  if (envio.veredictoOriginal === null) {
    throw new Error('Este envío no tiene una aprobación manual que revertir')
  }
  return {
    estado: envio.veredictoOriginal,
    veredictoOriginal: null,
    aprobadoPorId: null,
    aprobadoEn: null,
  }
}
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `npx vitest run tests/envios-aprobacion.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/envios/aprobacion.ts tests/envios-aprobacion.test.ts
git commit -m "feat: agregar lógica pura de aprobación manual de envíos"
```

---

## Task 11: Server functions de aprobación manual

**Files:**

- Modify: `src/server/functions/admin-submissions.ts`

**Interfaces:**

- Consumes: `aplicarAprobacionManual`/`revertirAprobacionEnvio` (Tarea 10).
- Produces: `obtenerDetalleEnvio`, `aprobarEnvioManualmente`, `revertirAprobacion` — consumidos por la Tarea 12 (pantalla de detalle).

- [ ] **Step 1: Agregar los server functions**

Reemplazar el contenido completo de `src/server/functions/admin-submissions.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { envios, usuarios, problemas } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import {
  aplicarAprobacionManual,
  revertirAprobacionEnvio,
} from '../envios/aprobacion'

export const listarTodosLosEnvios = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    return db
      .select({
        id: envios.id,
        nombreUsuario: usuarios.name,
        tituloProblema: problemas.titulo,
        lenguaje: envios.lenguaje,
        estado: envios.estado,
        creadoEn: envios.creadoEn,
      })
      .from(envios)
      .innerJoin(usuarios, eq(envios.usuarioId, usuarios.id))
      .innerJoin(problemas, eq(envios.problemaId, problemas.id))
      .orderBy(desc(envios.creadoEn))
      .limit(100)
  },
)

export const obtenerDetalleEnvio = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const filas = await db
      .select({
        id: envios.id,
        codigo: envios.codigo,
        lenguaje: envios.lenguaje,
        estado: envios.estado,
        resultados: envios.resultados,
        veredictoOriginal: envios.veredictoOriginal,
        comentarioClaude: envios.comentarioClaude,
        aprobadoEn: envios.aprobadoEn,
        creadoEn: envios.creadoEn,
        nombreUsuario: usuarios.name,
        tituloProblema: problemas.titulo,
      })
      .from(envios)
      .innerJoin(usuarios, eq(envios.usuarioId, usuarios.id))
      .innerJoin(problemas, eq(envios.problemaId, problemas.id))
      .where(eq(envios.id, data))

    return filas.length > 0 ? filas[0] : null
  })

export const aprobarEnvioManualmente = createServerFn({ method: 'POST' })
  .validator((envioId: string) => envioId)
  .handler(async ({ data }) => {
    const request = getRequest()
    const admin = await requerirAdmin(request.headers)

    const filas = await db.select().from(envios).where(eq(envios.id, data))
    const envio = filas.length > 0 ? filas[0] : null
    if (!envio) throw new Error('Envío no encontrado')

    const campos = aplicarAprobacionManual(
      { estado: envio.estado, veredictoOriginal: envio.veredictoOriginal },
      admin.id,
      new Date(),
    )
    await db.update(envios).set(campos).where(eq(envios.id, data))
  })

export const revertirAprobacion = createServerFn({ method: 'POST' })
  .validator((envioId: string) => envioId)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const filas = await db.select().from(envios).where(eq(envios.id, data))
    const envio = filas.length > 0 ? filas[0] : null
    if (!envio) throw new Error('Envío no encontrado')

    const campos = revertirAprobacionEnvio({
      veredictoOriginal: envio.veredictoOriginal,
    })
    await db.update(envios).set(campos).where(eq(envios.id, data))
  })
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add src/server/functions/admin-submissions.ts
git commit -m "feat: agregar server functions de detalle y aprobación manual de envíos"
```

---

## Task 12: Vista de detalle `/admin/envios/$envioId`

**Files:**

- Create: `src/routes/admin/envios/index.tsx` (contenido movido de `src/routes/admin/envios.tsx`)
- Delete: `src/routes/admin/envios.tsx`
- Create: `src/routes/admin/envios/$envioId.tsx`

**Interfaces:**

- Consumes: `obtenerDetalleEnvio`/`aprobarEnvioManualmente`/`revertirAprobacion` (Tarea 11), `enviosQueryOptions()` (Tarea 3).

- [ ] **Step 1: Convertir `envios.tsx` en un directorio**

Crear `src/routes/admin/envios/index.tsx` con el mismo contenido que `src/routes/admin/envios.tsx` (de la Tarea 3), pero cambiando la ruta a `/admin/envios/` (patrón índice, igual que `src/routes/admin/problemas/index.tsx`) y agregando un enlace por fila:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { enviosQueryOptions } from '#/server/queries/envios'

export const Route = createFileRoute('/admin/envios/')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(enviosQueryOptions()),
  component: AdminSubmissionsPage,
})

function AdminSubmissionsPage() {
  const { data: rows } = useSuspenseQuery(enviosQueryOptions())

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Envíos en vivo</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2 text-left">Hora</th>
            <th className="border p-2 text-left">Participante</th>
            <th className="border p-2 text-left">Problema</th>
            <th className="border p-2 text-left">Lenguaje</th>
            <th className="border p-2 text-left">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="border p-2">
                {new Date(row.creadoEn).toLocaleTimeString()}
              </td>
              <td className="border p-2">
                <Link
                  to="/admin/envios/$envioId"
                  params={{ envioId: row.id }}
                  className="text-blue-600 underline"
                >
                  {row.nombreUsuario}
                </Link>
              </td>
              <td className="border p-2">{row.tituloProblema}</td>
              <td className="border p-2">{row.lenguaje}</td>
              <td className="border p-2">{row.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

Borrar `src/routes/admin/envios.tsx` (su contenido quedó movido a `envios/index.tsx`).

- [ ] **Step 2: Crear la pantalla de detalle**

Crear `src/routes/admin/envios/$envioId.tsx`:

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import {
  obtenerDetalleEnvio,
  aprobarEnvioManualmente,
  revertirAprobacion,
} from '#/server/functions/admin-submissions'
import { enviosQueryOptions } from '#/server/queries/envios'

function detalleEnvioQueryOptions(envioId: string) {
  return queryOptions({
    queryKey: ['envios', envioId],
    queryFn: () => obtenerDetalleEnvio({ data: envioId }),
  })
}

export const Route = createFileRoute('/admin/envios/$envioId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      detalleEnvioQueryOptions(params.envioId),
    ),
  component: AdminEnvioDetailPage,
})

function AdminEnvioDetailPage() {
  const { envioId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: envio } = useSuspenseQuery(detalleEnvioQueryOptions(envioId))

  const invalidarTodo = () =>
    queryClient.invalidateQueries({ queryKey: enviosQueryOptions().queryKey })

  const aprobar = useMutation({
    mutationFn: () => aprobarEnvioManualmente({ data: envioId }),
    onSuccess: invalidarTodo,
  })

  const revertir = useMutation({
    mutationFn: () => revertirAprobacion({ data: envioId }),
    onSuccess: invalidarTodo,
  })

  if (!envio) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold">Envío no encontrado</h1>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-8">
      <button
        className="text-blue-600 underline"
        onClick={() => navigate({ to: '/admin/envios' })}
      >
        ← Volver a envíos
      </button>
      <h1 className="text-xl font-bold">
        {envio.nombreUsuario} — {envio.tituloProblema}
      </h1>
      <p>Lenguaje: {envio.lenguaje}</p>
      <p>
        Estado actual: <strong>{envio.estado}</strong>
      </p>
      {envio.veredictoOriginal && (
        <p className="text-sm text-gray-600">
          Veredicto original del sistema: {envio.veredictoOriginal} — aprobado
          manualmente el{' '}
          {envio.aprobadoEn ? new Date(envio.aprobadoEn).toLocaleString() : ''}
        </p>
      )}

      <pre className="whitespace-pre-wrap rounded bg-gray-50 p-2 text-sm">
        {envio.codigo}
      </pre>

      <h2 className="font-bold">Resultados por caso</h2>
      <ul className="flex flex-col gap-2">
        {(envio.resultados ?? []).map((r, i) => (
          <li key={i} className="border p-2 text-sm">
            <code>{r.argumentos.map((a) => JSON.stringify(a)).join(', ')}</code>{' '}
            — Esperado: <code>{r.salidaEsperada}</code> — Obtenido:{' '}
            <code>{r.salidaObtenida || r.salidaError}</code> —{' '}
            {r.aprobado ? '✅' : '❌'}
          </li>
        ))}
      </ul>

      {envio.comentarioClaude && (
        <div>
          <h2 className="font-bold">Comentario de Claude</h2>
          <p>{envio.comentarioClaude}</p>
        </div>
      )}

      <div className="flex gap-2">
        {envio.estado !== 'aceptado' && (
          <button
            className="rounded bg-green-600 px-4 py-2 text-white disabled:bg-gray-300"
            disabled={aprobar.isPending}
            onClick={() => aprobar.mutate()}
          >
            Aprobar manualmente
          </button>
        )}
        {envio.veredictoOriginal && (
          <button
            className="rounded bg-gray-200 px-4 py-2 disabled:bg-gray-100"
            disabled={revertir.isPending}
            onClick={() => revertir.mutate()}
          >
            Revertir a veredicto original
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Regenerar rutas y verificar que compila**

Run: `npm run generate-routes`
Run: `npm run build`
Expected: `routeTree.gen.ts` incluye `/admin/envios/` y `/admin/envios/$envioId`; build exitoso.

- [ ] **Step 4: Verificación manual**

Genera un envío de prueba (usa un usuario `invitado` sembrado y envía código incorrecto a propósito), entra a `/admin/envios`, haz clic en la fila, confirma que ves el código y los resultados por caso, aprueba manualmente y confirma que el estado cambia a `aceptado` y aparece el botón "Revertir"; revierte y confirma que vuelve al veredicto original.

- [ ] **Step 5: Commit**

```bash
git add src/routes/admin/envios/ src/routeTree.gen.ts
git rm src/routes/admin/envios.tsx
git commit -m "feat: agregar vista de detalle y aprobación manual de envíos"
```

---

## Task 13: `obtenerUsuarioActualOpcional`

**Files:**

- Modify: `src/server/functions/auth.ts`
- Create: `src/server/queries/usuarioActual.ts`

**Interfaces:**

- Produces: `obtenerUsuarioActualOpcional` (devuelve `user | null`, no lanza si no hay sesión), `usuarioActualOpcionalQueryOptions()` — consumidos por las Tareas 14 y 15 (navbars).

- [ ] **Step 1: Agregar el server function**

Reemplazar el contenido completo de `src/server/functions/auth.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { requerirUsuario, obtenerUsuarioSesion } from '../auth/middleware'

export const obtenerUsuarioActual = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    return requerirUsuario(request.headers)
  },
)

export const obtenerUsuarioActualOpcional = createServerFn({
  method: 'GET',
}).handler(async () => {
  const request = getRequest()
  return obtenerUsuarioSesion(request.headers)
})
```

- [ ] **Step 2: Crear las query options**

Crear `src/server/queries/usuarioActual.ts`:

```ts
import { queryOptions } from '@tanstack/react-query'
import { obtenerUsuarioActualOpcional } from '../functions/auth'

export function usuarioActualOpcionalQueryOptions() {
  return queryOptions({
    queryKey: ['usuarioActualOpcional'],
    queryFn: () => obtenerUsuarioActualOpcional(),
    refetchInterval: 3000,
  })
}
```

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add src/server/functions/auth.ts src/server/queries/usuarioActual.ts
git commit -m "feat: agregar consulta opcional del usuario actual (sin exigir sesión)"
```

---

## Task 14: NavbarAdmin + layout `/admin` + logout

**Files:**

- Create: `src/components/useCerrarSesion.ts`
- Create: `src/components/NavbarAdmin.tsx`
- Create: `src/routes/admin/route.tsx`

**Interfaces:**

- Consumes: `usuarioActualOpcionalQueryOptions()` (Tarea 13).
- Produces: `useCerrarSesion()` — reutilizado también por `NavbarParticipante` en la Tarea 15.

- [ ] **Step 1: Crear el hook de logout**

Crear `src/components/useCerrarSesion.ts`:

```ts
import { createAuthClient } from 'better-auth/react'
import { useNavigate } from '@tanstack/react-router'

const authClient = createAuthClient()

export function useCerrarSesion() {
  const navigate = useNavigate()
  return async function cerrarSesion() {
    await authClient.signOut()
    await navigate({ to: '/' })
  }
}
```

- [ ] **Step 2: Crear el navbar de admin**

Crear `src/components/NavbarAdmin.tsx`:

```tsx
import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'
import { useCerrarSesion } from './useCerrarSesion'

const ENLACES = [
  { to: '/admin/participantes', etiqueta: 'Participantes' },
  { to: '/admin/administradores', etiqueta: 'Administradores' },
  { to: '/admin/ingreso', etiqueta: 'Ingreso' },
  { to: '/admin/torneo', etiqueta: 'Torneo' },
  { to: '/admin/problemas', etiqueta: 'Problemas' },
  { to: '/admin/envios', etiqueta: 'Envíos' },
  { to: '/clasificacion', etiqueta: 'Clasificación' },
] as const

export function NavbarAdmin() {
  const { data: usuario } = useSuspenseQuery(
    usuarioActualOpcionalQueryOptions(),
  )
  const cerrarSesion = useCerrarSesion()

  return (
    <nav className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
      <div className="flex gap-4">
        {ENLACES.map((enlace) => (
          <Link
            key={enlace.to}
            to={enlace.to}
            className="text-sm font-medium text-gray-700 hover:text-blue-600"
            activeProps={{ className: 'text-blue-600' }}
          >
            {enlace.etiqueta}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-4">
        {usuario && (
          <span className="text-sm text-gray-500">{usuario.name}</span>
        )}
        <button
          className="text-sm text-red-600 underline"
          onClick={() => cerrarSesion()}
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Crear el layout de `/admin`**

Crear `src/routes/admin/route.tsx`:

```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { NavbarAdmin } from '#/components/NavbarAdmin'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'

export const Route = createFileRoute('/admin')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(usuarioActualOpcionalQueryOptions()),
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div>
      <NavbarAdmin />
      <Outlet />
    </div>
  )
}
```

- [ ] **Step 4: Regenerar rutas y verificar que compila**

Run: `npm run generate-routes`
Run: `npm run build`
Expected: build exitoso; `routeTree.gen.ts` ahora anida todas las rutas `/admin/*` bajo el layout nuevo.

- [ ] **Step 5: Verificación manual**

Con `npm run dev`, entra a cualquier ruta `/admin/*` como admin y confirma que el navbar aparece arriba con los 7 enlaces, tu nombre, y que "Cerrar sesión" te regresa a `/`.

- [ ] **Step 6: Commit**

```bash
git add src/components/useCerrarSesion.ts src/components/NavbarAdmin.tsx src/routes/admin/route.tsx src/routeTree.gen.ts
git commit -m "feat: agregar navbar de administrador con logout"
```

---

## Task 15: NavbarParticipante + layout `/_app`

**Files:**

- Create: `src/routes/_app/route.tsx`
- Create: `src/routes/_app/perfil.tsx` (movido de `src/routes/perfil.tsx`)
- Create: `src/routes/_app/problemas/index.tsx` (movido de `src/routes/problemas/index.tsx`)
- Create: `src/routes/_app/problemas/$problemaId.tsx` (movido de `src/routes/problemas/$problemaId.tsx`)
- Create: `src/routes/_app/clasificacion.tsx` (movido de `src/routes/clasificacion.tsx`)
- Delete: `src/routes/perfil.tsx`, `src/routes/problemas/index.tsx`, `src/routes/problemas/$problemaId.tsx`, `src/routes/clasificacion.tsx`
- Create: `src/components/NavbarParticipante.tsx`

**Interfaces:**

- Consumes: `usuarioActualOpcionalQueryOptions()` (Tarea 13), `useCerrarSesion()` (Tarea 14).

- [ ] **Step 1: Mover los 4 archivos de ruta**

El contenido de cada archivo no cambia — solo la ubicación (el prefijo `_app` es un layout route pathless: no agrega segmento a la URL). Usa `git mv` para preservar el historial:

```bash
mkdir -p src/routes/_app/problemas
git mv src/routes/perfil.tsx src/routes/_app/perfil.tsx
git mv src/routes/problemas/index.tsx src/routes/_app/problemas/index.tsx
git mv src/routes/problemas/\$problemaId.tsx src/routes/_app/problemas/\$problemaId.tsx
git mv src/routes/clasificacion.tsx src/routes/_app/clasificacion.tsx
rmdir src/routes/problemas
```

Expected: `src/routes/problemas/` queda vacío y se borra; los 4 archivos existen ahora bajo `src/routes/_app/` con el mismo contenido que tenían antes de moverse.

- [ ] **Step 2: Crear el navbar de participante**

Crear `src/components/NavbarParticipante.tsx`:

```tsx
import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'
import { useCerrarSesion } from './useCerrarSesion'

export function NavbarParticipante() {
  const { data: usuario } = useSuspenseQuery(
    usuarioActualOpcionalQueryOptions(),
  )
  const cerrarSesion = useCerrarSesion()

  if (!usuario) {
    return (
      <nav className="border-b bg-gray-50 px-4 py-2">
        <span className="text-sm font-medium text-gray-700">
          Torneo de Programación
        </span>
      </nav>
    )
  }

  return (
    <nav className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
      <div className="flex gap-4">
        <Link
          to="/perfil"
          className="text-sm font-medium text-gray-700 hover:text-blue-600"
          activeProps={{ className: 'text-blue-600' }}
        >
          Perfil
        </Link>
        {usuario.ingresadoEn && (
          <>
            <Link
              to="/problemas"
              className="text-sm font-medium text-gray-700 hover:text-blue-600"
              activeProps={{ className: 'text-blue-600' }}
            >
              Problemas
            </Link>
            <Link
              to="/clasificacion"
              className="text-sm font-medium text-gray-700 hover:text-blue-600"
              activeProps={{ className: 'text-blue-600' }}
            >
              Clasificación
            </Link>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{usuario.name}</span>
        <button
          className="text-sm text-red-600 underline"
          onClick={() => cerrarSesion()}
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Crear el layout `/_app`**

Crear `src/routes/_app/route.tsx`:

```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { NavbarParticipante } from '#/components/NavbarParticipante'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'

export const Route = createFileRoute('/_app')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(usuarioActualOpcionalQueryOptions()),
  component: AppLayout,
})

function AppLayout() {
  return (
    <div>
      <NavbarParticipante />
      <Outlet />
    </div>
  )
}
```

- [ ] **Step 4: Regenerar rutas**

Run: `npm run generate-routes`

Expected: el CLI regenera `routeTree.gen.ts` con el layout `/_app` envolviendo `/perfil`, `/problemas`, `/problemas/$problemaId` y `/clasificacion`, y — si detecta que el string pasado a `createFileRoute(...)` en algún archivo movido no coincide con el id derivado del nuevo path del archivo — lo reescribe automáticamente. Si el comando reescribe alguno de los 4 archivos movidos, **no revertir ese cambio**: es el comportamiento esperado del generador.

- [ ] **Step 5: Verificar que compila**

Run: `npm run build`
Expected: build exitoso, con las URLs `/perfil`, `/problemas`, `/problemas/$problemaId` y `/clasificacion` sin cambios.

- [ ] **Step 6: Verificación manual**

Con `npm run dev`:

- Como participante sin check-in: entra a `/perfil`, confirma que solo ves "Perfil" y "Cerrar sesión" en el navbar (no "Problemas" ni "Clasificación").
- Haz check-in a ese usuario desde `/admin/ingreso` (en otra pestaña/sesión de admin) y, sin recargar la pestaña del participante, confirma que "Problemas" y "Clasificación" aparecen solos dentro de los 3 segundos siguientes.
- Cierra sesión y confirma que `/clasificacion` sigue siendo visible (con el navbar mínimo, sin "Perfil" ni "Cerrar sesión") y que `/perfil` y `/problemas` ya no son accesibles sin volver a iniciar sesión.

- [ ] **Step 7: Commit**

```bash
git add src/routes/_app/ src/components/NavbarParticipante.tsx src/routeTree.gen.ts
git commit -m "feat: agregar navbar de participante con estado de check-in en vivo"
```

(Los `git mv` del Step 1 ya dejaron el borrado de las rutas viejas en stage — `git add` aquí solo agrega los archivos nuevos: `_app/route.tsx` y `NavbarParticipante.tsx`.)

---

## Verificación final

- [ ] Run: `npm run test` — Expected: toda la suite (incluyendo `tests/participantes-eliminar.test.ts` y `tests/envios-aprobacion.test.ts` nuevos) en verde.
- [ ] Run: `npm run build` — Expected: build de producción exitoso.
- [ ] Run: `npm run check` — Expected: `prettier --check .` sin diferencias (correr `npm run format` si hay diferencias, y commitear el resultado aparte).
