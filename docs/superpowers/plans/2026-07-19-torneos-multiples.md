# Soporte para múltiples torneos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el sistema, hoy modelado para un único torneo global, en uno que soporta
múltiples torneos anuales secuenciales — cada uno con sus propios participantes y problemas, solo
el más reciente editable, y con historial de solo lectura para los anteriores.

**Architecture:** Se agrega una tabla `torneos` y una columna `torneoId` (nullable) en `usuarios` y
`problemas`. "Torneo actual" es siempre una consulta derivada (`ORDER BY creadoEn DESC LIMIT 1`),
nunca un flag almacenado. Toda función de servidor que hoy lee el estado global (`estado_torneo`)
o filtra `usuarios`/`problemas` sin ámbito pasa a resolver el torneo actual (o, para lecturas de un
participante concreto, el torneo de ese participante) y filtrar por él. Las mutaciones de admin
sobre entidades existentes (problema, participante, respuesta) verifican que esa entidad
pertenezca al torneo actual antes de tocarla.

**Tech Stack:** TanStack Start (React 19, SSR), Drizzle ORM + MySQL, better-auth, Zod, Vitest.

## Global Constraints

- Todo identificador, columna, tabla, mensaje de error y comentario nuevo va en español, siguiendo
  la convención existente del repo (ver `CLAUDE.md`).
- `src/server/functions/*.ts` solo puede exportar valores `createServerFn` — ningún `export
  function` plano (lo hace cumplir `tests/funciones-solo-server-fn.test.ts`).
- Los tests que tocan la base de datos corren contra el MySQL real de `DATABASE_URL` (local/dev),
  sin mocks — igual que el resto de la suite existente (`crear-participante.test.ts`,
  `db.test.ts`, etc.). No se agrega limpieza explícita de filas; se sigue la convención existente
  de usar `crypto.randomUUID()` para datos únicos por test.
- Nunca ejecutar `drizzle-kit push` ni ningún script de backfill contra la base de datos de
  producción como parte de este plan — eso es un paso manual del usuario en el momento real del
  deploy (ver Task 13). Todo lo que se ejecuta aquí corre contra la base de datos de desarrollo
  local.
- Referencia de diseño completa: `docs/superpowers/specs/2026-07-19-torneos-multiples-design.md`.

---

## Task 1: Esquema — tabla `torneos` y columnas nuevas

**Files:**
- Modify: `src/server/db/schema.ts`
- Modify: `src/server/auth/auth.ts`
- Modify: `tests/db.test.ts`

**Interfaces:**
- Produces: tabla `torneos` (`id`, `anio`, `iniciadoEn`, `finalizadoEn`, `creadoEn`); columna
  `usuarios.torneoId` (`varchar(36)`, nullable, FK a `torneos.id`); columna
  `usuarios.correoOriginal` (`text`, nullable); columna `problemas.torneoId` (`varchar(36)`,
  nullable, FK a `torneos.id`). `SessionUser.torneoId` disponible en cualquier función de servidor
  vía `requerirUsuario`/`requerirParticipanteIngresado`.
- Nota: `torneoId` se deja **nullable a nivel de esquema** tanto en `usuarios` como en `problemas`
  (aunque conceptualmente todo `problema` y todo `usuario` con `rol = 'participante'` siempre
  tiene uno) — evita una migración `NOT NULL` sobre una tabla con filas existentes en producción.
  Se aplica el mismo patrón que ya usa este repo para `usuarios.categoria` en cuentas admin: la
  columna permite `NULL`, el código de creación es quien garantiza que siempre se rellene donde
  corresponde. `estado_torneo` **no se toca todavía** — se elimina recién en Task 13, después del
  backfill de producción.

- [ ] **Step 1: Agregar la tabla `torneos` y las columnas nuevas al esquema**

En `src/server/db/schema.ts`, agregar después de la definición de `usuarios` (antes de `sesiones`)
la tabla `torneos`:

```ts
export const torneos = mysqlTable('torneos', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  anio: int('anio').notNull().unique(),
  iniciadoEn: timestamp('iniciado_en'),
  finalizadoEn: timestamp('finalizado_en'),
  creadoEn: timestamp('creado_en').notNull().defaultNow(),
})
```

Como `torneos` es referenciada por `usuarios`, debe declararse **antes** de `usuarios` en el
archivo (Drizzle no requiere orden textual estricto para FKs vía `.references()` con arrow
function, pero para mantener el archivo legible colócala inmediatamente antes del bloque `//
Tablas centrales de Better Auth`).

En `usuarios`, agregar dos campos nuevos (después de `preguntasIaUsadas`):

```ts
  torneoId: varchar('torneo_id', { length: 36 }).references(() => torneos.id),
  correoOriginal: text('correo_original'),
```

En `problemas`, agregar un campo nuevo (después de `id`):

```ts
  torneoId: varchar('torneo_id', { length: 36 }).references(() => torneos.id),
```

- [ ] **Step 2: Exponer `torneoId` en la sesión de better-auth**

En `src/server/auth/auth.ts`, dentro de `user.additionalFields`, agregar (junto a `carnet`):

```ts
      torneoId: { type: 'string', required: false, input: false },
```

- [ ] **Step 3: Aplicar el esquema a la base de datos de desarrollo**

```bash
npx drizzle-kit push
```

Confirmar el prompt (agrega tabla y columnas nuevas, todas nullable — no debería pedir defaults ni
avisar de pérdida de datos).

- [ ] **Step 4: Agregar una prueba de la tabla nueva**

En `tests/db.test.ts`, agregar el import `torneos` a la lista existente y un nuevo `describe` al
final del archivo:

```ts
describe('torneos', () => {
  it('inserta y lee un torneo por año', async () => {
    const id = crypto.randomUUID()
    const anio = 2000 + Math.floor(Math.random() * 1000) // año único por test
    await db.insert(torneos).values({ id, anio })
    const rows = await db.select().from(torneos).where(eq(torneos.id, id))
    expect(rows[0]?.anio).toBe(anio)
    expect(rows[0]?.iniciadoEn).toBeNull()
    expect(rows[0]?.finalizadoEn).toBeNull()
  })
})
```

- [ ] **Step 5: Correr las pruebas**

```bash
npx vitest run tests/db.test.ts
```

Expected: PASS (todas, incluida la nueva).

- [ ] **Step 6: Commit**

```bash
git add src/server/db/schema.ts src/server/auth/auth.ts tests/db.test.ts
git commit -m "feat: agregar tabla torneos y columnas torneoId/correoOriginal"
```

---

## Task 2: Helpers de torneo actual

**Files:**
- Create: `src/server/tournament/actual.ts`
- Create: `tests/tournament-actual.test.ts`
- Modify: `src/server/tournament/guard.ts`
- Modify: `tests/tournament-guard.test.ts`

**Interfaces:**
- Consumes: tabla `torneos` (Task 1).
- Produces: `obtenerTorneoActual(): Promise<Torneo | null>`,
  `obtenerTorneoPorId(id: string): Promise<Torneo | null>`,
  `asegurarEsTorneoActual(torneoId: string, torneoActual: { id: string } | null): void` (lanza si
  `torneoActual` es `null` o su `id` no coincide), y `type Torneo = typeof torneos.$inferSelect`,
  todos desde `src/server/tournament/actual.ts`. `asegurarFinalizado(estado: { finalizadoEn: Date
  | null }): void` desde `src/server/tournament/guard.ts` (lanza si `finalizadoEn` es `null`).
  Todas las tareas siguientes que necesiten "el torneo actual" importan de aquí — ninguna vuelve a
  consultar `torneos` directamente con su propio `ORDER BY`.

- [ ] **Step 1: Escribir las pruebas de `obtenerTorneoActual` y `asegurarEsTorneoActual`**

Crear `tests/tournament-actual.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { db } from '../src/server/db/client'
import { torneos } from '../src/server/db/schema'
import {
  obtenerTorneoActual,
  obtenerTorneoPorId,
  asegurarEsTorneoActual,
} from '../src/server/tournament/actual'

describe('obtenerTorneoActual', () => {
  it('devuelve el torneo con creadoEn más reciente', async () => {
    const anioBase = 3000 + Math.floor(Math.random() * 1000)
    const idViejo = crypto.randomUUID()
    const idNuevo = crypto.randomUUID()
    await db.insert(torneos).values({
      id: idViejo,
      anio: anioBase,
      creadoEn: new Date('2020-01-01T00:00:00Z'),
    })
    await db.insert(torneos).values({
      id: idNuevo,
      anio: anioBase + 1,
      creadoEn: new Date('2021-01-01T00:00:00Z'),
    })

    const actual = await obtenerTorneoActual()
    expect(actual?.id).toBe(idNuevo)
  })
})

describe('obtenerTorneoPorId', () => {
  it('devuelve null si no existe', async () => {
    expect(await obtenerTorneoPorId(crypto.randomUUID())).toBeNull()
  })
})

describe('asegurarEsTorneoActual', () => {
  it('no lanza si el torneoId coincide con el torneo actual', () => {
    expect(() =>
      asegurarEsTorneoActual('t1', { id: 't1' }),
    ).not.toThrow()
  })

  it('lanza si el torneoId no coincide', () => {
    expect(() => asegurarEsTorneoActual('t1', { id: 't2' })).toThrow(
      'Este torneo ya no se puede editar',
    )
  })

  it('lanza si no hay ningún torneo actual', () => {
    expect(() => asegurarEsTorneoActual('t1', null)).toThrow(
      'Este torneo ya no se puede editar',
    )
  })
})
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npx vitest run tests/tournament-actual.test.ts
```

Expected: FAIL (no existe `src/server/tournament/actual.ts` todavía).

- [ ] **Step 3: Implementar `src/server/tournament/actual.ts`**

```ts
import { desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { obtenerUnaFila } from '../db/uno'
import { torneos } from '../db/schema'

export type Torneo = typeof torneos.$inferSelect

export async function obtenerTorneoActual(): Promise<Torneo | null> {
  return obtenerUnaFila(
    db.select().from(torneos).orderBy(desc(torneos.creadoEn)),
  )
}

export async function obtenerTorneoPorId(id: string): Promise<Torneo | null> {
  return obtenerUnaFila(db.select().from(torneos).where(eq(torneos.id, id)))
}

export function asegurarEsTorneoActual(
  torneoId: string,
  torneoActual: { id: string } | null,
) {
  if (!torneoActual || torneoActual.id !== torneoId) {
    throw new Error(
      'Este torneo ya no se puede editar (no es el torneo actual).',
    )
  }
}
```

- [ ] **Step 4: Agregar `asegurarFinalizado` a `src/server/tournament/guard.ts`**

Agregar al final del archivo:

```ts
export function asegurarFinalizado(estado: { finalizadoEn: Date | null }) {
  if (!estado.finalizadoEn) {
    throw new Error('El torneo actual debe concluir antes de crear uno nuevo')
  }
}
```

Agregar en `tests/tournament-guard.test.ts` (nuevo `describe` al final):

```ts
describe('asegurarFinalizado', () => {
  it('no lanza si el torneo concluyó', () => {
    expect(() =>
      asegurarFinalizado({ finalizadoEn: new Date() }),
    ).not.toThrow()
  })

  it('lanza si el torneo no ha concluido', () => {
    expect(() => asegurarFinalizado({ finalizadoEn: null })).toThrow(
      'El torneo actual debe concluir antes de crear uno nuevo',
    )
  })
})
```

Y actualizar el import al inicio del archivo para incluir `asegurarFinalizado`.

- [ ] **Step 5: Ejecutar ambos archivos de prueba**

```bash
npx vitest run tests/tournament-actual.test.ts tests/tournament-guard.test.ts
```

Expected: PASS (todas).

- [ ] **Step 6: Commit**

```bash
git add src/server/tournament/actual.ts src/server/tournament/guard.ts tests/tournament-actual.test.ts tests/tournament-guard.test.ts
git commit -m "feat: agregar helpers de torneo actual y guarda asegurarFinalizado"
```

---

## Task 3: Archivado de correos al cerrar un torneo

**Files:**
- Create: `src/server/participantes/archivar.ts`
- Create: `tests/participantes-archivar.test.ts`

**Interfaces:**
- Consumes: tablas `usuarios`, `cuentas` (Task 1).
- Produces: `archivarParticipantesDeTorneo(torneoId: string): Promise<void>` desde
  `src/server/participantes/archivar.ts`. Se usa en Task 4 (`crearTorneo`).

- [ ] **Step 1: Escribir la prueba**

Crear `tests/participantes-archivar.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { db } from '../src/server/db/client'
import { torneos, usuarios, cuentas } from '../src/server/db/schema'
import { archivarParticipantesDeTorneo } from '../src/server/participantes/archivar'

describe('archivarParticipantesDeTorneo', () => {
  it('mangla el correo, guarda el original, e invalida la contraseña de los participantes de ese torneo', async () => {
    const torneoId = crypto.randomUUID()
    await db.insert(torneos).values({
      id: torneoId,
      anio: 4000 + Math.floor(Math.random() * 1000),
    })

    const usuarioId = crypto.randomUUID()
    const correoOriginal = `repite-${usuarioId}@example.com`
    await db.insert(usuarios).values({
      id: usuarioId,
      name: 'Ana',
      email: correoOriginal,
      categoria: 'senior',
      torneoId,
    })
    await db.insert(cuentas).values({
      id: crypto.randomUUID(),
      userId: usuarioId,
      accountId: usuarioId,
      providerId: 'credential',
      password: 'hash-original',
    })

    await archivarParticipantesDeTorneo(torneoId)

    const [usuario] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, usuarioId))
    expect(usuario.email).not.toBe(correoOriginal)
    expect(usuario.email).toContain('@torneo.invalid')
    expect(usuario.correoOriginal).toBe(correoOriginal)

    const [cuenta] = await db
      .select()
      .from(cuentas)
      .where(
        and(eq(cuentas.userId, usuarioId), eq(cuentas.providerId, 'credential')),
      )
    expect(cuenta.password).toBeNull()
  })

  it('no toca administradores (torneoId null)', async () => {
    const torneoId = crypto.randomUUID()
    await db.insert(torneos).values({
      id: torneoId,
      anio: 5000 + Math.floor(Math.random() * 1000),
    })

    const adminId = crypto.randomUUID()
    const correoAdmin = `admin-${adminId}@example.com`
    await db.insert(usuarios).values({
      id: adminId,
      name: 'Admin',
      email: correoAdmin,
      categoria: 'senior',
      rol: 'admin',
      torneoId: null,
    })

    await archivarParticipantesDeTorneo(torneoId)

    const [admin] = await db.select().from(usuarios).where(eq(usuarios.id, adminId))
    expect(admin.email).toBe(correoAdmin)
  })
})
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npx vitest run tests/participantes-archivar.test.ts
```

Expected: FAIL (no existe el módulo).

- [ ] **Step 3: Implementar `src/server/participantes/archivar.ts`**

```ts
import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios, cuentas } from '../db/schema'

// El correo se mangla con el sufijo reservado por RFC 2606 (`.invalid`), que
// nunca resuelve a un dominio real — así el correo queda liberado para que el
// admin registre a la misma persona el año siguiente sin chocar con el
// índice único de `usuarios.email`, y la cuenta archivada queda imposible de
// autenticar (contraseña invalidada) aunque alguien conserve la original.
export async function archivarParticipantesDeTorneo(
  torneoId: string,
): Promise<void> {
  const participantes = await db
    .select({ id: usuarios.id, email: usuarios.email })
    .from(usuarios)
    .where(
      and(eq(usuarios.torneoId, torneoId), eq(usuarios.rol, 'participante')),
    )

  for (const participante of participantes) {
    const correoArchivado = `${participante.id}@torneo.invalid`
    await db.transaction(async (tx) => {
      await tx
        .update(usuarios)
        .set({ email: correoArchivado, correoOriginal: participante.email })
        .where(eq(usuarios.id, participante.id))
      await tx
        .update(cuentas)
        .set({ password: null })
        .where(
          and(
            eq(cuentas.userId, participante.id),
            eq(cuentas.providerId, 'credential'),
          ),
        )
    })
  }
}
```

- [ ] **Step 4: Ejecutar la prueba**

```bash
npx vitest run tests/participantes-archivar.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/participantes/archivar.ts tests/participantes-archivar.test.ts
git commit -m "feat: archivar correos y credenciales de participantes al cerrar su torneo"
```

---

## Task 4: Ciclo de vida del torneo — reescribir `functions/tournament.ts`

**Files:**
- Modify: `src/server/functions/tournament.ts`
- Modify: `src/server/queries/torneo.ts`
- Modify: `src/routes/admin/torneo.tsx`
- Create: `tests/tournament-functions.test.ts`

**Interfaces:**
- Consumes: `obtenerTorneoActual`, `obtenerTorneoPorId`, `Torneo` (Task 2);
  `archivarParticipantesDeTorneo` (Task 3); `asegurarNoIniciado`, `asegurarIniciado`,
  `asegurarFinalizado` (`src/server/tournament/guard.ts`).
- Produces: `obtenerEstadoTorneo(): Promise<Torneo | null>`,
  `iniciarTorneo(): Promise<{ iniciadoEn: Date }>`,
  `concluirTorneo(): Promise<{ finalizadoEn: Date }>`,
  `crearTorneo(data: { anio: number }): Promise<{ id: string; anio: number }>`,
  `listarTorneos(): Promise<Torneo[]>` — todos exportados desde
  `src/server/functions/tournament.ts`. `listarTorneos` se usa en Task 12 (historial).

- [ ] **Step 1: Escribir las pruebas de servidor**

Crear `tests/tournament-functions.test.ts`. Estas pruebas llaman directo a las funciones (no vía
HTTP) y simulan el admin creando/insertando filas — no hay mocking de `requerirAdmin` porque estas
funciones lo llaman internamente vía `getRequest()`, que fuera de una request real de TanStack
Start lanza. Para probar la lógica de negocio sin pasar por el request real, las pruebas llaman
directamente a las funciones auxiliares no exportadas como server-fn. Dado que `crearTorneo`,
`iniciarTorneo`, etc. son `createServerFn`, se prueban indirectamente a través de sus piezas puras
ya cubiertas (`asegurarFinalizado`, `asegurarEsTorneoActual` en Task 2) y a través de
`archivarParticipantesDeTorneo` (Task 3). Para este archivo, en cambio, se prueba el
comportamiento de `guardarProgresoPendiente` (la única lógica no trivial que queda sin cobertura
directa), extrayéndolo como función exportada:

```ts
import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '../src/server/db/client'
import { torneos, usuarios, problemas, corridas, envios } from '../src/server/db/schema'
import { guardarProgresoPendiente } from '../src/server/functions/tournament'

describe('guardarProgresoPendiente', () => {
  it('crea un envio pendiente por cada corrida sin envio, solo del torneo dado', async () => {
    const torneoId = crypto.randomUUID()
    await db.insert(torneos).values({
      id: torneoId,
      anio: 6000 + Math.floor(Math.random() * 1000),
    })
    const otroTorneoId = crypto.randomUUID()
    await db.insert(torneos).values({
      id: otroTorneoId,
      anio: 7000 + Math.floor(Math.random() * 1000),
    })

    const usuarioId = crypto.randomUUID()
    await db.insert(usuarios).values({
      id: usuarioId,
      name: 'Ana',
      email: `ana-${usuarioId}@example.com`,
      categoria: 'senior',
      torneoId,
    })
    const usuarioOtroTorneoId = crypto.randomUUID()
    await db.insert(usuarios).values({
      id: usuarioOtroTorneoId,
      name: 'Beto',
      email: `beto-${usuarioOtroTorneoId}@example.com`,
      categoria: 'senior',
      torneoId: otroTorneoId,
    })

    const problemaId = crypto.randomUUID()
    await db.insert(problemas).values({
      id: problemaId,
      titulo: 'P',
      descripcion: 'd',
      dificultad: 'Fácil',
      grupo: 'senior',
      puntos: 10,
      parametros: [],
      tipoRetorno: 'int',
      torneoId,
    })

    const ultimaEjecucionEn = new Date('2026-01-01T00:00:00Z')
    await db.insert(corridas).values({
      usuarioId,
      problemaId,
      contador: 1,
      ultimoCodigo: 'print(1)',
      ultimoLenguaje: 'python',
      ultimoVeredicto: 'respuesta_incorrecta',
      ultimaEjecucionEn,
    })
    await db.insert(corridas).values({
      usuarioId: usuarioOtroTorneoId,
      problemaId,
      contador: 1,
      ultimoCodigo: 'print(2)',
      ultimoLenguaje: 'python',
      ultimoVeredicto: 'respuesta_incorrecta',
      ultimaEjecucionEn,
    })

    await guardarProgresoPendiente(torneoId, new Date())

    const filas = await db
      .select()
      .from(envios)
      .where(eq(envios.usuarioId, usuarioId))
    expect(filas.length).toBe(1)
    expect(filas[0].estadoProgreso).toBe('pendiente')
    expect(filas[0].codigo).toBe('print(1)')

    const filasOtroTorneo = await db
      .select()
      .from(envios)
      .where(eq(envios.usuarioId, usuarioOtroTorneoId))
    expect(filasOtroTorneo.length).toBe(0)
  })
})
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npx vitest run tests/tournament-functions.test.ts
```

Expected: FAIL (`guardarProgresoPendiente` no está exportada todavía / no existe con esa firma).

- [ ] **Step 3: Reescribir `src/server/functions/tournament.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/client'
import { obtenerUnaFila } from '../db/uno'
import { torneos, usuarios, corridas, envios } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import {
  asegurarNoIniciado,
  asegurarIniciado,
  asegurarFinalizado,
} from '../tournament/guard'
import { obtenerTorneoActual } from '../tournament/actual'
import { archivarParticipantesDeTorneo } from '../participantes/archivar'

export const obtenerEstadoTorneo = createServerFn({ method: 'GET' }).handler(
  async () => {
    return obtenerTorneoActual()
  },
)

export const iniciarTorneo = createServerFn({ method: 'POST' }).handler(
  async () => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const torneo = await obtenerTorneoActual()
    if (!torneo) throw new Error('No hay ningún torneo creado todavía')
    asegurarNoIniciado(torneo)

    const iniciadoEn = new Date()
    await db
      .update(torneos)
      .set({ iniciadoEn })
      .where(eq(torneos.id, torneo.id))

    return { iniciadoEn }
  },
)

export const concluirTorneo = createServerFn({ method: 'POST' }).handler(
  async () => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const torneo = await obtenerTorneoActual()
    if (!torneo) throw new Error('No hay ningún torneo creado todavía')
    asegurarIniciado(torneo)

    const finalizadoEn = new Date()
    await db
      .update(torneos)
      .set({ finalizadoEn })
      .where(eq(torneos.id, torneo.id))

    await guardarProgresoPendiente(torneo.id, finalizadoEn)

    return { finalizadoEn }
  },
)

const crearTorneoSchema = z.object({
  anio: z.number().int().min(2000).max(2100),
})

export const crearTorneo = createServerFn({ method: 'POST' })
  .validator(crearTorneoSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const torneoActual = await obtenerTorneoActual()
    if (torneoActual) {
      asegurarFinalizado(torneoActual)
    }

    const existente = await obtenerUnaFila(
      db.select().from(torneos).where(eq(torneos.anio, data.anio)),
    )
    if (existente) throw new Error('Ya existe un torneo con ese año')

    const id = crypto.randomUUID()
    await db.insert(torneos).values({ id, anio: data.anio })

    if (torneoActual) {
      await archivarParticipantesDeTorneo(torneoActual.id)
    }

    return { id, anio: data.anio }
  })

export const listarTorneos = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    await requerirAdmin(request.headers)
    return db.select().from(torneos).orderBy(desc(torneos.creadoEn))
  },
)

export async function guardarProgresoPendiente(
  torneoId: string,
  finalizadoEn: Date,
) {
  const corridasDelTorneo = await db
    .select({
      usuarioId: corridas.usuarioId,
      problemaId: corridas.problemaId,
      ultimoCodigo: corridas.ultimoCodigo,
      ultimoLenguaje: corridas.ultimoLenguaje,
      ultimoVeredicto: corridas.ultimoVeredicto,
      ultimosResultados: corridas.ultimosResultados,
      ultimaEjecucionEn: corridas.ultimaEjecucionEn,
    })
    .from(corridas)
    .innerJoin(usuarios, eq(usuarios.id, corridas.usuarioId))
    .where(eq(usuarios.torneoId, torneoId))

  if (corridasDelTorneo.length === 0) return

  const usuariosDelTorneo = corridasDelTorneo.map((c) => c.usuarioId)
  const enviosExistentes = await db
    .select({ usuarioId: envios.usuarioId, problemaId: envios.problemaId })
    .from(envios)
    .where(inArray(envios.usuarioId, usuariosDelTorneo))
  const clavesExistentes = new Set(
    enviosExistentes.map((e) => `${e.usuarioId}:${e.problemaId}`),
  )

  for (const corrida of corridasDelTorneo) {
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

Nota: `guardarProgresoPendiente` deja de ser una función interna sin exportar — ahora es
`export async function` en un archivo de `src/server/functions/`. Esto violaría la regla "solo
`createServerFn`" (`tests/funciones-solo-server-fn.test.ts`) si quedara en `functions/tournament.ts`.
Por eso, antes de continuar:

- [ ] **Step 4: Mover `guardarProgresoPendiente` a un módulo server plano**

Crear `src/server/tournament/progresoPendiente.ts` con el cuerpo exacto de la función
`guardarProgresoPendiente` de arriba (mismos imports de `db`, `torneos` no se usa ahí realmente —
solo `corridas`, `usuarios`, `envios` desde `../db/schema`). Quitar la definición de
`functions/tournament.ts` y en su lugar importarla:

```ts
import { guardarProgresoPendiente } from '../tournament/progresoPendiente'
```

Actualizar `tests/tournament-functions.test.ts` para importar desde
`'../src/server/tournament/progresoPendiente'` en vez de `'../src/server/functions/tournament'`.

- [ ] **Step 5: Ejecutar la prueba de nuevo**

```bash
npx vitest run tests/tournament-functions.test.ts
```

Expected: PASS.

- [ ] **Step 6: Verificar la regla de server-fn**

```bash
npx vitest run tests/funciones-solo-server-fn.test.ts
```

Expected: PASS.

- [ ] **Step 7: Actualizar `src/server/queries/torneo.ts`**

```ts
import { queryOptions } from '@tanstack/react-query'
import { obtenerEstadoTorneo, listarTorneos } from '../functions/tournament'

export function estadoTorneoQueryOptions() {
  return queryOptions({
    queryKey: ['estadoTorneo'],
    queryFn: () => obtenerEstadoTorneo(),
  })
}

export function torneosQueryOptions() {
  return queryOptions({
    queryKey: ['torneos'],
    queryFn: () => listarTorneos(),
  })
}
```

- [ ] **Step 8: Actualizar `src/routes/admin/torneo.tsx`**

Reescribir el componente para manejar `estado: Torneo | null`, y agregar el formulario de "crear
torneo":

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  iniciarTorneo,
  concluirTorneo,
  crearTorneo,
} from '#/server/functions/tournament'
import { estadoTorneoQueryOptions } from '#/server/queries/torneo'
import { LoadingButton } from '#/components/LoadingButton'
import { useToastMutation } from '#/components/useToastMutation'

export const Route = createFileRoute('/admin/torneo')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(estadoTorneoQueryOptions()),
  component: TournamentControlPage,
})

function TournamentControlPage() {
  const queryClient = useQueryClient()
  const { data: estado } = useSuspenseQuery(estadoTorneoQueryOptions())
  const [anio, setAnio] = useState('')

  const crear = useToastMutation({
    mutationFn: (anio: number) => crearTorneo({ data: { anio } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: estadoTorneoQueryOptions().queryKey,
      })
      toast.success('Torneo creado.')
      setAnio('')
    },
  })

  const iniciar = useToastMutation({
    mutationFn: () => iniciarTorneo(),
    onSuccess: (resultado) => {
      queryClient.setQueryData(estadoTorneoQueryOptions().queryKey, {
        ...estado,
        iniciadoEn: resultado.iniciadoEn,
        finalizadoEn: null,
      })
      toast.success('Torneo iniciado.')
    },
  })

  const concluir = useToastMutation({
    mutationFn: () => concluirTorneo(),
    onSuccess: (resultado) => {
      queryClient.setQueryData(estadoTorneoQueryOptions().queryKey, {
        ...estado,
        finalizadoEn: resultado.finalizadoEn,
      })
      toast.success('Torneo concluido.')
    },
  })

  if (!estado) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold">Control del torneo</h1>
        <p className="mt-2">No hay ningún torneo creado todavía.</p>
        <FormularioCrearTorneo
          anio={anio}
          setAnio={setAnio}
          onSubmit={() => crear.mutate(Number(anio))}
          isPending={crear.isPending}
        />
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Control del torneo {estado.anio}</h1>
      {estado.finalizadoEn ? (
        <div>
          <p>
            Torneo concluido a las{' '}
            {new Date(estado.finalizadoEn).toLocaleTimeString()}
          </p>
          <div className="mt-6 border-t pt-4">
            <h2 className="font-bold">Crear el torneo del siguiente año</h2>
            <FormularioCrearTorneo
              anio={anio}
              setAnio={setAnio}
              onSubmit={() => crear.mutate(Number(anio))}
              isPending={crear.isPending}
            />
          </div>
        </div>
      ) : estado.iniciadoEn ? (
        <div>
          <p>
            Torneo iniciado a las{' '}
            {new Date(estado.iniciadoEn).toLocaleTimeString()}
          </p>
          <LoadingButton
            className="mt-4 rounded bg-red-600 px-4 py-2 text-white"
            onClick={() => concluir.mutate()}
            isPending={concluir.isPending}
            label="Concluir torneo"
            pendingLabel="Concluyendo..."
          />
        </div>
      ) : (
        <LoadingButton
          className="rounded bg-red-600 px-4 py-2 text-white"
          onClick={() => iniciar.mutate()}
          isPending={iniciar.isPending}
          label="Iniciar torneo"
          pendingLabel="Iniciando..."
        />
      )}
    </div>
  )
}

function FormularioCrearTorneo(props: {
  anio: string
  setAnio: (v: string) => void
  onSubmit: () => void
  isPending: boolean
}) {
  return (
    <form
      className="mt-4 flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        props.onSubmit()
      }}
    >
      <div>
        <label className="mb-1 block font-bold">Año</label>
        <input
          className="border p-2"
          type="number"
          value={props.anio}
          onChange={(e) => props.setAnio(e.target.value)}
          required
        />
      </div>
      <LoadingButton
        className="rounded bg-blue-600 px-4 py-2 text-white"
        type="submit"
        isPending={props.isPending}
        label="Crear torneo"
        pendingLabel="Creando..."
      />
    </form>
  )
}
```

- [ ] **Step 9: Correr toda la suite relacionada**

```bash
npx vitest run tests/tournament-functions.test.ts tests/tournament-guard.test.ts tests/tournament-actual.test.ts tests/funciones-solo-server-fn.test.ts
```

Expected: PASS (todas).

- [ ] **Step 10: Commit**

```bash
git add src/server/functions/tournament.ts src/server/tournament/progresoPendiente.ts src/server/queries/torneo.ts src/routes/admin/torneo.tsx tests/tournament-functions.test.ts
git commit -m "feat: ciclo de vida de torneo actual, con creacion de nuevos torneos"
```

---

## Task 5: `crearCuentaParticipante` con `torneoId` y sus llamadores

**Files:**
- Modify: `src/server/participantes/crear.ts`
- Modify: `src/server/functions/participantes.ts`
- Modify: `tests/crear-participante.test.ts`

**Interfaces:**
- Consumes: `obtenerTorneoActual` (Task 2).
- Produces: `crearCuentaParticipante` acepta ahora `torneoId?: string | null` en su input; si se
  omite, inserta `torneoId: null` (caso admin, sin cambios de comportamiento para
  `administradores.ts`, que no pasa este campo).

- [ ] **Step 1: Actualizar la prueba existente y agregar un caso nuevo**

En `tests/crear-participante.test.ts`, agregar un `import { torneos } from
'../src/server/db/schema'` y un `import { eq } from 'drizzle-orm'` (si no está), y un nuevo test
dentro de `describe('crearCuentaParticipante', ...)`:

```ts
  it('guarda el torneoId cuando se provee', async () => {
    const torneoId = crypto.randomUUID()
    await db.insert(torneos).values({
      id: torneoId,
      anio: 8000 + Math.floor(Math.random() * 1000),
    })
    const correo = `con-torneo-${crypto.randomUUID()}@example.com`
    const { id } = await crearCuentaParticipante({
      nombre: 'Cati',
      correo,
      categoria: 'junior',
      carnet: '1',
      semestre: '3',
      torneoId,
    })
    const [usuario] = await db.select().from(usuarios).where(eq(usuarios.id, id))
    expect(usuario.torneoId).toBe(torneoId)
  })

  it('deja torneoId en null cuando no se provee (caso admin)', async () => {
    const correo = `sin-torneo-${crypto.randomUUID()}@example.com`
    const { id } = await crearCuentaParticipante({
      nombre: 'Sin Torneo',
      correo,
      categoria: 'senior',
      carnet: null,
      rol: 'admin',
    })
    const [usuario] = await db.select().from(usuarios).where(eq(usuarios.id, id))
    expect(usuario.torneoId).toBeNull()
  })
```

Agregar `usuarios` al import de `'../src/server/db/schema'` si no está ya presente en ese archivo.

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npx vitest run tests/crear-participante.test.ts
```

Expected: FAIL (los tests nuevos fallan porque `crearCuentaParticipante` no acepta/graba
`torneoId` todavía; los tests existentes deben seguir pasando).

- [ ] **Step 3: Actualizar `src/server/participantes/crear.ts`**

```ts
export async function crearCuentaParticipante(input: {
  nombre: string
  correo: string
  categoria: Categoria
  carnet: string | null
  semestre?: Semestre | null
  rol?: 'participante' | 'admin'
  torneoId?: string | null
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
      semestre: input.semestre ?? null,
      rol: input.rol ?? 'participante',
      torneoId: input.torneoId ?? null,
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

- [ ] **Step 4: Actualizar `registrarParticipante` en `src/server/functions/participantes.ts`**

```ts
import { obtenerTorneoActual } from '../tournament/actual'

export const registrarParticipante = createServerFn({ method: 'POST' })
  .validator(datosParticipanteSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const torneo = await obtenerTorneoActual()
    if (!torneo) {
      throw new Error(
        'No hay ningún torneo actual; crea un torneo antes de registrar participantes.',
      )
    }

    const { id, contrasenaGenerada } = await crearCuentaParticipante({
      ...data,
      torneoId: torneo.id,
    })

    const correoEnviado = await enviarCorreoBienvenidaSeguro({
      nombre: data.nombre,
      correo: data.correo,
      contrasena: contrasenaGenerada,
    })

    return {
      id,
      nombre: data.nombre,
      correo: data.correo,
      categoria: data.categoria,
      correoEnviado,
      contrasenaGenerada,
    }
  })
```

(`administradores.ts` no cambia: sigue llamando `crearCuentaParticipante` sin `torneoId`, que por
default queda `null`.)

- [ ] **Step 5: Ejecutar las pruebas**

```bash
npx vitest run tests/crear-participante.test.ts
```

Expected: PASS (todas).

- [ ] **Step 6: Commit**

```bash
git add src/server/participantes/crear.ts src/server/functions/participantes.ts tests/crear-participante.test.ts
git commit -m "feat: asociar participantes nuevos al torneo actual"
```

---

## Task 6: Guardas de torneo actual en mutaciones de participantes existentes

**Files:**
- Modify: `src/server/functions/participantes.ts`

**Interfaces:**
- Consumes: `obtenerTorneoActual`, `asegurarEsTorneoActual` (Task 2).
- Produces: `obtenerParticipantes` filtra por torneo actual; `reenviarCredenciales` y
  `eliminarParticipante` rechazan si el participante no pertenece al torneo actual.

**Nota sobre cobertura de pruebas de esta tarea:** el comportamiento de la guarda en sí
(`asegurarEsTorneoActual`) ya está exhaustivamente probado en `tests/tournament-actual.test.ts`
(Task 2). Las tres funciones que se modifican aquí (`obtenerParticipantes`, `reenviarCredenciales`,
`eliminarParticipante`) llaman `getRequest()`/`requerirAdmin` internamente, lo que exige una
request real de TanStack Start — siguiendo el patrón ya establecido en este repo, ninguna función
`createServerFn` con esa guarda tiene un test unitario directo (confirmalo: `functions/problems.ts`,
`functions/admin-respuestas.ts`, `functions/run.ts` tampoco lo tienen). Por eso este task no agrega
un archivo de test nuevo — la cobertura queda en la guarda pura (Task 2) más la verificación manual
del Step 3.

- [ ] **Step 1: Implementar las guardas en `src/server/functions/participantes.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, sql } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { db } from '../db/client'
import { obtenerUnaFila } from '../db/uno'
import { usuarios, cuentas, envios, preguntasIa } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import { crearCuentaParticipante } from '../participantes/crear'
import { generarContrasenaAleatoria } from '../auth/password'
import { enviarCorreoBienvenidaSeguro } from '../email/brevo'
import { puedeEliminarParticipante } from '../../shared/participantes'
import { datosParticipanteSchema } from '../participantes/validar'
import { idSchema } from '../validacion/comun'
import { obtenerTorneoActual, asegurarEsTorneoActual } from '../tournament/actual'

export const registrarParticipante = createServerFn({ method: 'POST' })
  .validator(datosParticipanteSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const torneo = await obtenerTorneoActual()
    if (!torneo) {
      throw new Error(
        'No hay ningún torneo actual; crea un torneo antes de registrar participantes.',
      )
    }

    const { id, contrasenaGenerada } = await crearCuentaParticipante({
      ...data,
      torneoId: torneo.id,
    })

    const correoEnviado = await enviarCorreoBienvenidaSeguro({
      nombre: data.nombre,
      correo: data.correo,
      contrasena: contrasenaGenerada,
    })

    return {
      id,
      nombre: data.nombre,
      correo: data.correo,
      categoria: data.categoria,
      correoEnviado,
      contrasenaGenerada,
    }
  })

export const reenviarCredenciales = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const usuario = await obtenerUnaFila(
      db.select().from(usuarios).where(eq(usuarios.id, data)),
    )
    if (!usuario) throw new Error('Participante no encontrado')
    const torneoActual = await obtenerTorneoActual()
    asegurarEsTorneoActual(usuario.torneoId ?? '', torneoActual)

    const contrasenaGenerada = generarContrasenaAleatoria()
    const hash = await hashPassword(contrasenaGenerada)
    await db
      .update(cuentas)
      .set({ password: hash })
      .where(
        and(eq(cuentas.userId, data), eq(cuentas.providerId, 'credential')),
      )

    const correoEnviado = await enviarCorreoBienvenidaSeguro({
      nombre: usuario.name,
      correo: usuario.email,
      contrasena: contrasenaGenerada,
    })

    return { correoEnviado, contrasenaGenerada }
  })

export const obtenerParticipantes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const torneo = await obtenerTorneoActual()
    if (!torneo) return []

    const filas = await db
      .select({
        id: usuarios.id,
        nombre: usuarios.name,
        correo: usuarios.email,
        categoria: usuarios.categoria,
        carnet: usuarios.carnet,
        semestre: usuarios.semestre,
        ingresadoEn: usuarios.ingresadoEn,
        cantidadEnvios: sql<number>`count(${envios.id})`,
      })
      .from(usuarios)
      .leftJoin(envios, eq(envios.usuarioId, usuarios.id))
      .where(
        and(eq(usuarios.rol, 'participante'), eq(usuarios.torneoId, torneo.id)),
      )
      .groupBy(usuarios.id)

    return filas.map((f) => ({
      ...f,
      cantidadEnvios: Number(f.cantidadEnvios),
    }))
  },
)

export const eliminarParticipante = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const usuario = await obtenerUnaFila(
      db.select().from(usuarios).where(eq(usuarios.id, data)),
    )
    if (!usuario) throw new Error('Participante no encontrado')
    const torneoActual = await obtenerTorneoActual()
    asegurarEsTorneoActual(usuario.torneoId ?? '', torneoActual)

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

- [ ] **Step 2: Ejecutar la suite completa de participantes**

```bash
npx vitest run tests/crear-participante.test.ts tests/participantes-validar.test.ts
```

Expected: PASS.

- [ ] **Step 3: Verificación manual (dev server)**

```bash
npm run dev
```

Con un admin logeado y un torneo actual creado: confirmar en `/admin/participantes` que solo
aparecen participantes del torneo actual, que registrar uno nuevo funciona, y que reenviar
credenciales/eliminar funcionan sobre participantes del torneo actual. (No hay todavía un segundo
torneo para probar el caso de rechazo — se verifica end-to-end en Task 12 tras tener
`crearTorneo` funcionando con datos reales.)

- [ ] **Step 4: Commit**

```bash
git add src/server/functions/participantes.ts
git commit -m "feat: acotar gestion de participantes al torneo actual"
```

---

## Task 7: `cargarDatosClasificacion` con `torneoId` explícito

**Files:**
- Modify: `src/server/standings/datos.ts`
- Modify: `src/server/functions/leaderboard.ts`
- Modify: `src/server/functions/progreso.ts`
- Create: `tests/standings-datos.test.ts`

**Interfaces:**
- Consumes: `obtenerTorneoActual`, `obtenerTorneoPorId` (Task 2).
- Produces: `cargarDatosClasificacion(torneoId: string): Promise<{ clasificacion, todosUsuarios,
  todosProblemas, torneoIniciadoEn }>` — mismo shape que antes, ahora recibe `torneoId` en vez de
  leer `estado_torneo` sin ámbito.

- [ ] **Step 1: Escribir la prueba**

Crear `tests/standings-datos.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '../src/server/db/client'
import { torneos, usuarios, problemas, envios } from '../src/server/db/schema'
import { cargarDatosClasificacion } from '../src/server/standings/datos'

describe('cargarDatosClasificacion', () => {
  it('solo incluye usuarios, problemas y envios del torneo dado', async () => {
    const torneoA = crypto.randomUUID()
    const torneoB = crypto.randomUUID()
    const iniciadoEn = new Date('2026-01-01T00:00:00Z')
    await db.insert(torneos).values([
      { id: torneoA, anio: 1100 + Math.floor(Math.random() * 100), iniciadoEn },
      { id: torneoB, anio: 1300 + Math.floor(Math.random() * 100) },
    ])

    const usuarioA = crypto.randomUUID()
    const usuarioB = crypto.randomUUID()
    await db.insert(usuarios).values([
      {
        id: usuarioA,
        name: 'A',
        email: `a-${usuarioA}@example.com`,
        categoria: 'senior',
        torneoId: torneoA,
      },
      {
        id: usuarioB,
        name: 'B',
        email: `b-${usuarioB}@example.com`,
        categoria: 'senior',
        torneoId: torneoB,
      },
    ])

    const problemaA = crypto.randomUUID()
    const problemaB = crypto.randomUUID()
    await db.insert(problemas).values([
      {
        id: problemaA,
        titulo: 'PA',
        descripcion: 'd',
        dificultad: 'Fácil',
        grupo: 'senior',
        puntos: 10,
        parametros: [],
        tipoRetorno: 'int',
        torneoId: torneoA,
      },
      {
        id: problemaB,
        titulo: 'PB',
        descripcion: 'd',
        dificultad: 'Fácil',
        grupo: 'senior',
        puntos: 10,
        parametros: [],
        tipoRetorno: 'int',
        torneoId: torneoB,
      },
    ])

    await db.insert(envios).values([
      {
        usuarioId: usuarioA,
        problemaId: problemaA,
        codigo: 'c',
        lenguaje: 'python',
        estadoProgreso: 'completado',
      },
      {
        usuarioId: usuarioB,
        problemaId: problemaB,
        codigo: 'c',
        lenguaje: 'python',
        estadoProgreso: 'completado',
      },
    ])

    const datos = await cargarDatosClasificacion(torneoA)
    expect(datos.todosUsuarios.map((u) => u.id)).toEqual([usuarioA])
    expect(datos.todosProblemas.map((p) => p.id)).toEqual([problemaA])
    expect(datos.clasificacion.map((c) => c.usuarioId)).toEqual([usuarioA])
    expect(datos.torneoIniciadoEn).toEqual(iniciadoEn)
  })
})
```

- [ ] **Step 2: Ejecutar y confirmar que falla**

```bash
npx vitest run tests/standings-datos.test.ts
```

Expected: FAIL (`cargarDatosClasificacion` no acepta parámetro todavía).

- [ ] **Step 3: Reescribir `src/server/standings/datos.ts`**

```ts
import { eq, inArray } from 'drizzle-orm'
import { db } from '../db/client'
import { obtenerUnaFila } from '../db/uno'
import { usuarios, envios, problemas, torneos } from '../db/schema'
import { calcularClasificacion } from './calculate'
import type {
  RegistroUsuario,
  RegistroEnvio,
  RegistroProblema,
} from './calculate'

export async function cargarDatosClasificacion(torneoId: string) {
  const [torneo, todosUsuarios, todosProblemas] = await Promise.all([
    obtenerUnaFila(db.select().from(torneos).where(eq(torneos.id, torneoId))),
    db.select().from(usuarios).where(eq(usuarios.torneoId, torneoId)),
    db.select().from(problemas).where(eq(problemas.torneoId, torneoId)),
  ])
  const torneoIniciadoEn = torneo?.iniciadoEn ?? null

  const idsUsuarios = todosUsuarios.map((u) => u.id)
  const todosEnvios =
    idsUsuarios.length > 0
      ? await db
          .select()
          .from(envios)
          .where(inArray(envios.usuarioId, idsUsuarios))
      : []

  const usuariosElegibles: RegistroUsuario[] = todosUsuarios
    .filter((u) => u.rol === 'participante')
    .map((u) => ({ id: u.id, nombre: u.name, categoria: u.categoria }))

  const registrosEnvios: RegistroEnvio[] = todosEnvios.map((e) => ({
    usuarioId: e.usuarioId,
    problemaId: e.problemaId,
    estadoProgreso: e.estadoProgreso,
    creadoEn: e.creadoEn,
  }))

  const registrosProblemas: RegistroProblema[] = todosProblemas.map((p) => ({
    id: p.id,
    puntos: p.puntos,
  }))

  const clasificacion = calcularClasificacion(
    usuariosElegibles,
    registrosEnvios,
    registrosProblemas,
    torneoIniciadoEn ?? new Date(),
  )

  return { clasificacion, todosUsuarios, todosProblemas, torneoIniciadoEn }
}
```

- [ ] **Step 4: Actualizar `src/server/functions/leaderboard.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { agruparClasificacionPorCategoria } from '../standings/calculate'
import { cargarDatosClasificacion } from '../standings/datos'
import { obtenerTorneoActual } from '../tournament/actual'

export const obtenerClasificacion = createServerFn({ method: 'GET' }).handler(
  async () => {
    const torneo = await obtenerTorneoActual()
    if (!torneo) {
      return { iniciado: false as const, invitado: [], junior: [], senior: [] }
    }

    const { clasificacion, torneoIniciadoEn } = await cargarDatosClasificacion(
      torneo.id,
    )
    if (!torneoIniciadoEn) {
      return { iniciado: false as const, invitado: [], junior: [], senior: [] }
    }

    const agrupado = agruparClasificacionPorCategoria(clasificacion)
    return { iniciado: true as const, ...agrupado }
  },
)
```

- [ ] **Step 5: Actualizar `src/server/functions/progreso.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { problemas, envios } from '../db/schema'
import { requerirParticipanteIngresado } from '../auth/middleware'
import { grupoDeCategoria } from '../problems/grupo'
import { calcularDuraciones } from '../standings/duracion'
import { cargarDatosClasificacion } from '../standings/datos'
import { calcularPuestoEntreAsistentes } from '../standings/asistentes'

export const obtenerMiProgreso = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const user = await requerirParticipanteIngresado(request.headers)

    if (user.rol === 'admin' || !user.torneoId) {
      return { puntosTotales: 0, puesto: null, problemas: [] }
    }

    const { clasificacion, todosUsuarios, torneoIniciadoEn } =
      await cargarDatosClasificacion(user.torneoId)
    const clasificacionCategoria = clasificacion.filter(
      (f) => f.categoria === user.categoria,
    )
    const filaClasificacion =
      clasificacionCategoria.find((f) => f.usuarioId === user.id) ?? null

    const puesto = calcularPuestoEntreAsistentes(
      clasificacionCategoria,
      todosUsuarios,
      user.id,
    )

    const grupo = grupoDeCategoria(
      user.categoria as 'invitado' | 'junior' | 'senior',
    )
    const [problemasDelGrupo, enviosDelUsuario] = await Promise.all([
      db
        .select()
        .from(problemas)
        .where(
          and(eq(problemas.grupo, grupo), eq(problemas.torneoId, user.torneoId)),
        )
        .orderBy(problemas.orden),
      db.select().from(envios).where(eq(envios.usuarioId, user.id)),
    ])

    const envioPorProblema = new Map(
      enviosDelUsuario.map((e) => [e.problemaId, e]),
    )
    const resueltos = enviosDelUsuario
      .filter((e) => e.estadoProgreso !== 'pendiente')
      .map((e) => ({ problemaId: e.problemaId, creadoEn: e.creadoEn }))
    const duraciones = new Map(
      calcularDuraciones(resueltos, torneoIniciadoEn ?? new Date()).map((d) => [
        d.problemaId,
        d.duracionMinutos,
      ]),
    )

    const problemasConEstado = problemasDelGrupo.map((p) => {
      const envio = envioPorProblema.get(p.id)
      return {
        problemaId: p.id,
        estadoProgreso: envio?.estadoProgreso ?? ('pendiente' as const),
        duracionMinutos: duraciones.get(p.id) ?? null,
      }
    })

    return {
      puntosTotales: filaClasificacion?.puntosTotales ?? 0,
      puesto,
      problemas: problemasConEstado,
    }
  },
)
```

- [ ] **Step 6: Ejecutar las pruebas**

```bash
npx vitest run tests/standings-datos.test.ts tests/standings.test.ts tests/standings-duracion.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/server/standings/datos.ts src/server/functions/leaderboard.ts src/server/functions/progreso.ts tests/standings-datos.test.ts
git commit -m "feat: acotar clasificacion y progreso al torneo actual/propio"
```

---

## Task 8: `functions/problems.ts` — scoping completo por torneo

**Files:**
- Modify: `src/server/functions/problems.ts`

**Interfaces:**
- Consumes: `obtenerTorneoActual`, `obtenerTorneoPorId`, `asegurarEsTorneoActual` (Task 2).
- Produces: sin cambios de firma pública — `listarProblemas`, `obtenerProblema`, `crearProblema`,
  `actualizarProblema`, `eliminarProblema` mantienen los mismos parámetros/retornos, ahora
  correctamente acotados por torneo.

- [ ] **Step 1: Reescribir `src/server/functions/problems.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { obtenerUnaFila } from '../db/uno'
import { problemas, casosPrueba, problemaLenguajes } from '../db/schema'
import {
  requerirAdmin,
  requerirParticipanteIngresado,
} from '../auth/middleware'
import {
  validarDatosProblema,
  datosProblemaSchema,
  datosProblemaConIdSchema,
} from '../problems/validate'
import { grupoDeCategoria } from '../problems/grupo'
import { idSchema } from '../validacion/comun'
import { calcularResueltoParaUsuario } from '../envios/resuelto'
import {
  obtenerTorneoActual,
  obtenerTorneoPorId,
  asegurarEsTorneoActual,
} from '../tournament/actual'

export const listarProblemas = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const user = await requerirParticipanteIngresado(request.headers)

    if (user.rol === 'admin') {
      const torneo = await obtenerTorneoActual()
      if (!torneo) return []
      return db
        .select()
        .from(problemas)
        .where(eq(problemas.torneoId, torneo.id))
        .orderBy(problemas.orden)
    }

    if (!user.torneoId) return []
    const torneo = await obtenerTorneoPorId(user.torneoId)
    if (!torneo?.iniciadoEn) return []

    const grupo = grupoDeCategoria(
      user.categoria as 'invitado' | 'junior' | 'senior',
    )
    return db
      .select()
      .from(problemas)
      .where(
        and(eq(problemas.grupo, grupo), eq(problemas.torneoId, user.torneoId)),
      )
      .orderBy(problemas.orden)
  },
)

export const obtenerProblema = createServerFn({ method: 'GET' })
  .validator(idSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const user = await requerirParticipanteIngresado(request.headers)
    const filaProblema = await obtenerUnaFila(
      db.select().from(problemas).where(eq(problemas.id, data)),
    )

    let torneoIniciadoEn: Date | null = null
    if (user.rol !== 'admin' && user.torneoId) {
      const torneo = await obtenerTorneoPorId(user.torneoId)
      torneoIniciadoEn = torneo?.iniciadoEn ?? null
    }

    const puedeVerlo =
      user.rol === 'admin' ||
      (filaProblema?.torneoId === user.torneoId &&
        filaProblema?.grupo ===
          grupoDeCategoria(user.categoria as 'invitado' | 'junior' | 'senior') &&
        Boolean(torneoIniciadoEn))
    const problema = filaProblema && puedeVerlo ? filaProblema : null
    const casosCompletos = problema
      ? await db
          .select()
          .from(casosPrueba)
          .where(eq(casosPrueba.problemaId, data))
      : []
    const casos =
      user.rol === 'admin'
        ? casosCompletos
        : casosCompletos.filter((c) => c.visible)
    const lenguajes = problema
      ? await db
          .select()
          .from(problemaLenguajes)
          .where(eq(problemaLenguajes.problemaId, data))
      : []
    const resuelto =
      problema && user.rol !== 'admin' && torneoIniciadoEn
        ? await calcularResueltoParaUsuario(user.id, problema, torneoIniciadoEn)
        : null
    return { problema, casosPrueba: casos, lenguajes, resuelto }
  })

export const crearProblema = createServerFn({ method: 'POST' })
  .validator(datosProblemaSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const errores = validarDatosProblema(data)
    if (errores.length > 0) throw new Error(errores.join(', '))

    const torneo = await obtenerTorneoActual()
    if (!torneo) throw new Error('No hay ningún torneo actual')

    const id = crypto.randomUUID()
    await db.insert(problemas).values({
      id,
      torneoId: torneo.id,
      titulo: data.titulo,
      descripcion: data.descripcion,
      dificultad: data.dificultad,
      categoriaProblema: data.categoriaProblema,
      orden: data.orden,
      grupo: data.grupo,
      puntos: data.puntos,
      parametros: data.parametros,
      tipoRetorno: data.tipoRetorno,
    })

    if (data.lenguajes.length > 0) {
      await db.insert(problemaLenguajes).values(
        data.lenguajes.map((l) => ({
          problemaId: id,
          lenguaje: l.lenguaje,
          nombreFuncion: l.nombreFuncion,
          codigoInicial: l.codigoInicial,
        })),
      )
    }

    if (data.casosPrueba.length > 0) {
      await db.insert(casosPrueba).values(
        data.casosPrueba.map((cp) => ({
          problemaId: id,
          argumentos: cp.argumentos,
          salidaEsperada: cp.salidaEsperada,
          visible: cp.visible,
        })),
      )
    }

    return { id, ...data }
  })

export const actualizarProblema = createServerFn({ method: 'POST' })
  .validator(datosProblemaConIdSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const errores = validarDatosProblema(data)
    if (errores.length > 0) throw new Error(errores.join(', '))

    const problemaExistente = await obtenerUnaFila(
      db.select().from(problemas).where(eq(problemas.id, data.id)),
    )
    if (!problemaExistente) throw new Error('Problema no encontrado')
    const torneoActual = await obtenerTorneoActual()
    asegurarEsTorneoActual(problemaExistente.torneoId ?? '', torneoActual)

    await db
      .update(problemas)
      .set({
        titulo: data.titulo,
        descripcion: data.descripcion,
        dificultad: data.dificultad,
        categoriaProblema: data.categoriaProblema,
        orden: data.orden,
        grupo: data.grupo,
        puntos: data.puntos,
        parametros: data.parametros,
        tipoRetorno: data.tipoRetorno,
      })
      .where(eq(problemas.id, data.id))

    await db
      .delete(problemaLenguajes)
      .where(eq(problemaLenguajes.problemaId, data.id))
    if (data.lenguajes.length > 0) {
      await db.insert(problemaLenguajes).values(
        data.lenguajes.map((l) => ({
          problemaId: data.id,
          lenguaje: l.lenguaje,
          nombreFuncion: l.nombreFuncion,
          codigoInicial: l.codigoInicial,
        })),
      )
    }

    await db.delete(casosPrueba).where(eq(casosPrueba.problemaId, data.id))
    if (data.casosPrueba.length > 0) {
      await db.insert(casosPrueba).values(
        data.casosPrueba.map((cp) => ({
          problemaId: data.id,
          argumentos: cp.argumentos,
          salidaEsperada: cp.salidaEsperada,
          visible: cp.visible,
        })),
      )
    }
  })

export const eliminarProblema = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const problemaExistente = await obtenerUnaFila(
      db.select().from(problemas).where(eq(problemas.id, data)),
    )
    if (!problemaExistente) throw new Error('Problema no encontrado')
    const torneoActual = await obtenerTorneoActual()
    asegurarEsTorneoActual(problemaExistente.torneoId ?? '', torneoActual)

    await db.delete(problemas).where(eq(problemas.id, data))
  })
```

- [ ] **Step 2: Ejecutar las pruebas de problemas existentes**

```bash
npx vitest run tests/problems-grupo.test.ts tests/problems-validate.test.ts
```

Expected: PASS (estas pruebas cubren las funciones puras que no cambiaron; el archivo
`functions/problems.ts` en sí no tiene test directo en este repo — ver nota de patrón en Task 6).

- [ ] **Step 3: Verificación manual**

```bash
npm run dev
```

Como admin, con un torneo actual iniciado: crear un problema en `/admin/problemas`, confirmar que
aparece en la lista, editarlo, y confirmar que un participante logeado de ese torneo lo ve en
`/problemas`.

- [ ] **Step 4: Commit**

```bash
git add src/server/functions/problems.ts
git commit -m "feat: acotar problemas por torneo actual/propio del participante"
```

---

## Task 9: `functions/run.ts` — torneo actual y verificación cruzada

**Files:**
- Modify: `src/server/functions/run.ts`

**Interfaces:**
- Consumes: `obtenerTorneoActual` (Task 2).
- Produces: sin cambios de firma; `ejecutarCodigo` ahora valida contra el torneo actual (en vez de
  `estado_torneo`) y rechaza si el problema no pertenece al torneo del usuario.

- [ ] **Step 1: Reemplazar el bloque de estado de torneo y agregar la verificación cruzada**

En `src/server/functions/run.ts`, cambiar el import:

```diff
-import {
-  problemas,
-  casosPrueba,
-  problemaLenguajes,
-  corridas,
-  envios,
-  estadoTorneo,
-} from '../db/schema'
+import { problemas, casosPrueba, problemaLenguajes, corridas, envios } from '../db/schema'
```

```diff
-import { asegurarIniciado } from '../tournament/guard'
+import { asegurarIniciado } from '../tournament/guard'
+import { obtenerTorneoActual } from '../tournament/actual'
```

Reemplazar el bloque de estado y la obtención del problema:

```diff
-      const estado = await obtenerUnaFila(
-        db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1)),
-      )
-      asegurarIniciado(estado ?? { iniciadoEn: null, finalizadoEn: null })
+      const torneoActual = await obtenerTorneoActual()
+      asegurarIniciado(torneoActual ?? { iniciadoEn: null, finalizadoEn: null })

       const problema = await obtenerUnaFila(
         db.select().from(problemas).where(eq(problemas.id, data.problemaId)),
       )
       if (!problema) throw new Error('Problema no encontrado')
+      if (problema.torneoId !== user.torneoId) {
+        throw new Error('Este problema no pertenece a tu torneo')
+      }
```

Reemplazar las dos referencias restantes a `estado?.iniciadoEn` por `torneoActual?.iniciadoEn`
(una dentro del bloque `if (veredicto === 'aceptado')`, calculando `resuelto`).

- [ ] **Step 2: Ejecutar las pruebas de judge existentes (no deben romperse)**

```bash
npm run test
```

Expected: PASS en toda la suite (las pruebas de judge/harness mockean `ejecutarJudge0`, no tocan
`run.ts` directamente — confirmar que nada quedó roto por el rename).

- [ ] **Step 3: Verificación manual**

```bash
npm run dev
```

Como participante del torneo actual (iniciado), correr código en un problema propio y confirmar
que califica igual que antes.

- [ ] **Step 4: Commit**

```bash
git add src/server/functions/run.ts
git commit -m "feat: validar ejecucion de codigo contra el torneo actual"
```

---

## Task 10: `assistant.ts` — scoping por torneo del participante

**Files:**
- Modify: `src/server/functions/assistant.ts`

**Interfaces:**
- Consumes: ninguna nueva (usa `user.torneoId` ya disponible desde Task 1).
- Produces: sin cambios de firma; `preguntarAsistente` solo considera problemas del torneo propio
  del participante.

- [ ] **Step 1: Actualizar `src/server/functions/assistant.ts`**

```diff
     const problema = await obtenerUnaFila(
       db.select().from(problemas).where(eq(problemas.id, data.problemaId)),
     )
     if (!problema) throw new Error('Problema no encontrado')
+    if (problema.torneoId !== usuarioActualizado.torneoId) {
+      throw new Error('Problema no encontrado')
+    }

     const problemasDelGrupo = await db
       .select()
       .from(problemas)
-      .where(
-        eq(problemas.grupo, grupoDeCategoria(usuarioActualizado.categoria)),
-      )
+      .where(
+        and(
+          eq(problemas.grupo, grupoDeCategoria(usuarioActualizado.categoria)),
+          eq(problemas.torneoId, usuarioActualizado.torneoId ?? ''),
+        ),
+      )
       .orderBy(problemas.orden)
```

Actualizar el import de `drizzle-orm` para incluir `and`:

```diff
-import { and, eq, lt, sql } from 'drizzle-orm'
+import { and, eq, lt, sql } from 'drizzle-orm'
```

(ya estaba importado — solo confirmar que sigue estándolo, no requiere cambio de import en este
archivo).

- [ ] **Step 2: Ejecutar las pruebas relacionadas**

```bash
npx vitest run tests/assistant-limit.test.ts tests/claude-feedback.test.ts
```

Expected: PASS (no tocan `preguntarAsistente` directamente, pero confirman que nada del módulo
`claude/` se rompió).

- [ ] **Step 3: Commit**

```bash
git add src/server/functions/assistant.ts
git commit -m "feat: acotar el asistente de invitado al torneo propio del participante"
```

---

## Task 11: `admin-respuestas.ts` — guarda de edición y variante por torneo histórico

**Files:**
- Modify: `src/server/functions/admin-respuestas.ts`

**Interfaces:**
- Consumes: `obtenerTorneoActual`, `obtenerTorneoPorId`, `asegurarEsTorneoActual` (Task 2);
  `cargarDatosClasificacion(torneoId)` (Task 7).
- Produces: `listarParticipantesConProgreso(): Promise<Fila[]>` (sin cambios de firma, ahora
  acotada al torneo actual); nueva `listarParticipantesConProgresoDeTorneo(torneoId: string):
  Promise<Fila[]>` (usada en Task 12 para el historial); `obtenerProgresoParticipante(usuarioId)`
  sin cambios de firma, ahora correctamente acotada al torneo **del participante consultado** (no
  al torneo actual) — por eso sirve tanto para `/admin/respuestas/$usuarioId` como para la vista
  histórica; `actualizarEstadoProgreso` rechaza si el problema no pertenece al torneo actual.

- [ ] **Step 1: Reescribir `src/server/functions/admin-respuestas.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { obtenerUnaFila } from '../db/uno'
import { usuarios, envios, problemas, corridas } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import { agruparClasificacionPorCategoria } from '../standings/calculate'
import { cargarDatosClasificacion } from '../standings/datos'
import { calcularDuraciones } from '../standings/duracion'
import {
  filtrarAsistentes,
  calcularPuestoEntreAsistentes,
} from '../standings/asistentes'
import { grupoDeCategoria } from '../problems/grupo'
import {
  aplicarCambioEstadoManual,
  actualizarEstadoProgresoSchema,
} from '../envios/progreso'
import { idSchema } from '../validacion/comun'
import { obtenerTorneoActual, asegurarEsTorneoActual } from '../tournament/actual'

async function construirListaConProgreso(torneoId: string) {
  const { clasificacion, todosUsuarios, todosProblemas } =
    await cargarDatosClasificacion(torneoId)

  const totalPorGrupo = {
    invitado_junior: todosProblemas.filter(
      (p) => p.grupo === 'invitado_junior',
    ).length,
    senior: todosProblemas.filter((p) => p.grupo === 'senior').length,
  }

  const agrupado = agruparClasificacionPorCategoria(
    filtrarAsistentes(clasificacion, todosUsuarios),
  )

  return (['invitado', 'junior', 'senior'] as const).flatMap((categoria) =>
    agrupado[categoria].map((fila, i) => ({
      usuarioId: fila.usuarioId,
      nombre: fila.nombre,
      categoria: fila.categoria,
      cantidadCompletados: fila.cantidadResueltos,
      cantidadPendientes:
        totalPorGrupo[grupoDeCategoria(fila.categoria)] -
        fila.cantidadResueltos,
      puntosTotales: fila.puntosTotales,
      puesto: i + 1,
    })),
  )
}

export const listarParticipantesConProgreso = createServerFn({
  method: 'GET',
}).handler(async () => {
  const request = getRequest()
  await requerirAdmin(request.headers)

  const torneo = await obtenerTorneoActual()
  if (!torneo) return []
  return construirListaConProgreso(torneo.id)
})

export const listarParticipantesConProgresoDeTorneo = createServerFn({
  method: 'GET',
})
  .validator(idSchema)
  .handler(async ({ data: torneoId }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)
    return construirListaConProgreso(torneoId)
  })

export const obtenerProgresoParticipante = createServerFn({ method: 'GET' })
  .validator(idSchema)
  .handler(async ({ data: usuarioId }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const usuario = await obtenerUnaFila(
      db.select().from(usuarios).where(eq(usuarios.id, usuarioId)),
    )
    if (!usuario) throw new Error('Participante no encontrado')
    if (!usuario.torneoId) throw new Error('Participante sin torneo asignado')

    const { clasificacion, todosUsuarios, torneoIniciadoEn } =
      await cargarDatosClasificacion(usuario.torneoId)
    const clasificacionCategoria = clasificacion.filter(
      (f) => f.categoria === usuario.categoria,
    )
    const filaClasificacion =
      clasificacionCategoria.find((f) => f.usuarioId === usuarioId) ?? null

    const puesto = calcularPuestoEntreAsistentes(
      clasificacionCategoria,
      todosUsuarios,
      usuarioId,
    )

    const grupo = grupoDeCategoria(usuario.categoria)
    const [problemasDelGrupo, enviosDelUsuario, corridasDelUsuario] =
      await Promise.all([
        db
          .select()
          .from(problemas)
          .where(
            and(
              eq(problemas.grupo, grupo),
              eq(problemas.torneoId, usuario.torneoId),
            ),
          )
          .orderBy(problemas.orden),
        db.select().from(envios).where(eq(envios.usuarioId, usuarioId)),
        db.select().from(corridas).where(eq(corridas.usuarioId, usuarioId)),
      ])

    const envioPorProblema = new Map(
      enviosDelUsuario.map((e) => [e.problemaId, e]),
    )
    const corridaPorProblema = new Map(
      corridasDelUsuario.map((c) => [c.problemaId, c]),
    )

    const resueltos = enviosDelUsuario
      .filter((e) => e.estadoProgreso !== 'pendiente')
      .map((e) => ({ problemaId: e.problemaId, creadoEn: e.creadoEn }))
    const duraciones = new Map(
      calcularDuraciones(resueltos, torneoIniciadoEn ?? new Date()).map((d) => [
        d.problemaId,
        d.duracionMinutos,
      ]),
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
      participante: {
        id: usuario.id,
        nombre: usuario.name,
        categoria: usuario.categoria,
      },
      puntosTotales: filaClasificacion?.puntosTotales ?? 0,
      puesto,
      problemas: problemasConEstado,
    }
  })

export const actualizarEstadoProgreso = createServerFn({ method: 'POST' })
  .validator(actualizarEstadoProgresoSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const admin = await requerirAdmin(request.headers)

    const problema = await obtenerUnaFila(
      db.select().from(problemas).where(eq(problemas.id, data.problemaId)),
    )
    if (!problema) throw new Error('Problema no encontrado')
    const torneoActual = await obtenerTorneoActual()
    asegurarEsTorneoActual(problema.torneoId ?? '', torneoActual)

    const corrida = await obtenerUnaFila(
      db
        .select()
        .from(corridas)
        .where(
          and(
            eq(corridas.usuarioId, data.usuarioId),
            eq(corridas.problemaId, data.problemaId),
          ),
        ),
    )

    const campos = aplicarCambioEstadoManual(
      data.estadoProgreso,
      admin.id,
      new Date(),
      corrida?.ultimaEjecucionEn ?? null,
    )

    const envioExistente = await obtenerUnaFila(
      db
        .select()
        .from(envios)
        .where(
          and(
            eq(envios.usuarioId, data.usuarioId),
            eq(envios.problemaId, data.problemaId),
          ),
        ),
    )

    if (envioExistente) {
      await db
        .update(envios)
        .set(campos)
        .where(eq(envios.id, envioExistente.id))
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

- [ ] **Step 2: Ejecutar las pruebas relacionadas**

```bash
npx vitest run tests/envios-progreso.test.ts tests/standings-datos.test.ts
```

Expected: PASS.

- [ ] **Step 3: Verificación manual**

```bash
npm run dev
```

En `/admin/respuestas`, confirmar que la lista y el detalle de un participante siguen funcionando
para el torneo actual, y que cambiar el estado de un problema sigue funcionando.

- [ ] **Step 4: Commit**

```bash
git add src/server/functions/admin-respuestas.ts
git commit -m "feat: acotar respuestas de admin al torneo actual y exponer variante por torneo"
```

---

## Task 12: UI de historial de torneos

**Files:**
- Modify: `src/components/NavbarAdmin.tsx`
- Modify: `src/server/queries/torneo.ts`
- Create: `src/server/queries/historial.ts`
- Create: `src/routes/admin/historial/index.tsx`
- Create: `src/routes/admin/historial/$torneoId/index.tsx`
- Create: `src/routes/admin/historial/$torneoId/$usuarioId.tsx`

**Interfaces:**
- Consumes: `listarTorneos`, `obtenerEstadoTorneo` (Task 4);
  `listarParticipantesConProgresoDeTorneo`, `obtenerProgresoParticipante` (Task 11).
- Produces: rutas `/admin/historial`, `/admin/historial/$torneoId`,
  `/admin/historial/$torneoId/$usuarioId`, todas de solo lectura (sin controles de edición).

- [ ] **Step 1: Agregar `torneosQueryOptions` si no quedó de Task 4**

Confirmar que `src/server/queries/torneo.ts` ya exporta `torneosQueryOptions` (agregado en Task 4,
Step 7). Si por algún motivo no quedó, agregarlo ahora tal como se especificó ahí.

- [ ] **Step 2: Crear `src/server/queries/historial.ts`**

```ts
import { queryOptions } from '@tanstack/react-query'
import {
  listarParticipantesConProgresoDeTorneo,
  obtenerProgresoParticipante,
} from '../functions/admin-respuestas'

export function historialParticipantesQueryOptions(torneoId: string) {
  return queryOptions({
    queryKey: ['historial', torneoId],
    queryFn: () => listarParticipantesConProgresoDeTorneo({ data: torneoId }),
  })
}

export function historialParticipanteDetalleQueryOptions(usuarioId: string) {
  return queryOptions({
    queryKey: ['historial-detalle', usuarioId],
    queryFn: () => obtenerProgresoParticipante({ data: usuarioId }),
  })
}
```

- [ ] **Step 3: Crear `src/routes/admin/historial/index.tsx`**

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { estadoTorneoQueryOptions, torneosQueryOptions } from '#/server/queries/torneo'
import { CLASE_TABLA, CLASE_FILA } from '#/components/tableStyles'

export const Route = createFileRoute('/admin/historial/')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(torneosQueryOptions()),
      context.queryClient.ensureQueryData(estadoTorneoQueryOptions()),
    ])
  },
  component: HistorialIndexPage,
})

function HistorialIndexPage() {
  const { data: torneos } = useSuspenseQuery(torneosQueryOptions())
  const { data: torneoActual } = useSuspenseQuery(estadoTorneoQueryOptions())
  const pasados = torneos.filter((t) => t.id !== torneoActual?.id)

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Historial de torneos</h1>
      {pasados.length === 0 ? (
        <p className="mt-4">Todavía no hay torneos anteriores.</p>
      ) : (
        <table className={`mt-4 ${CLASE_TABLA}`}>
          <thead>
            <tr className={CLASE_FILA}>
              <th className="p-2">Año</th>
              <th className="p-2">Iniciado</th>
              <th className="p-2">Concluido</th>
            </tr>
          </thead>
          <tbody>
            {pasados.map((t) => (
              <tr key={t.id} className={CLASE_FILA}>
                <td className="p-2">
                  <Link
                    to="/admin/historial/$torneoId"
                    params={{ torneoId: t.id }}
                    className="text-blue-600 underline"
                  >
                    {t.anio}
                  </Link>
                </td>
                <td className="p-2">
                  {t.iniciadoEn ? new Date(t.iniciadoEn).toLocaleString() : '—'}
                </td>
                <td className="p-2">
                  {t.finalizadoEn
                    ? new Date(t.finalizadoEn).toLocaleString()
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Crear `src/routes/admin/historial/$torneoId/index.tsx`**

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { historialParticipantesQueryOptions } from '#/server/queries/historial'
import { CLASE_TABLA, CLASE_FILA } from '#/components/tableStyles'

export const Route = createFileRoute('/admin/historial/$torneoId/')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      historialParticipantesQueryOptions(params.torneoId),
    ),
  component: HistorialTorneoPage,
})

const ETIQUETAS_CATEGORIA: Record<string, string> = {
  invitado: 'Invitado',
  junior: 'Junior',
  senior: 'Senior',
}

function HistorialTorneoPage() {
  const { torneoId } = Route.useParams()
  const { data } = useSuspenseQuery(
    historialParticipantesQueryOptions(torneoId),
  )

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Resultados</h1>
      {(['invitado', 'junior', 'senior'] as const).map((categoria) => {
        const filas = data.filter((f) => f.categoria === categoria)
        if (filas.length === 0) return null
        return (
          <div key={categoria} className="mt-6">
            <h2 className="text-lg font-bold">
              {ETIQUETAS_CATEGORIA[categoria]}
            </h2>
            <table className={`mt-2 ${CLASE_TABLA}`}>
              <thead>
                <tr className={CLASE_FILA}>
                  <th className="p-2">Puesto</th>
                  <th className="p-2">Nombre</th>
                  <th className="p-2">Completados</th>
                  <th className="p-2">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.usuarioId} className={CLASE_FILA}>
                    <td className="p-2">{f.puesto}</td>
                    <td className="p-2">
                      <Link
                        to="/admin/historial/$torneoId/$usuarioId"
                        params={{ torneoId, usuarioId: f.usuarioId }}
                        className="text-blue-600 underline"
                      >
                        {f.nombre}
                      </Link>
                    </td>
                    <td className="p-2">{f.cantidadCompletados}</td>
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

- [ ] **Step 5: Crear `src/routes/admin/historial/$torneoId/$usuarioId.tsx`**

```tsx
import { Fragment, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { historialParticipanteDetalleQueryOptions } from '#/server/queries/historial'
import { formatearArgumentos } from '#/components/labels'
import { CLASE_TABLA, CLASE_FILA } from '#/components/tableStyles'

export const Route = createFileRoute('/admin/historial/$torneoId/$usuarioId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      historialParticipanteDetalleQueryOptions(params.usuarioId),
    ),
  component: HistorialParticipanteDetallePage,
})

const ETIQUETAS_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  completado: 'Completado',
  aprobado_manual: 'Aprobado manual',
}

function HistorialParticipanteDetallePage() {
  const { usuarioId } = Route.useParams()
  const { data } = useSuspenseQuery(
    historialParticipanteDetalleQueryOptions(usuarioId),
  )
  const [expandido, setExpandido] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-4 p-8">
      <h1 className="text-xl font-bold">
        {data.participante.nombre} — {data.puntosTotales} pts — Puesto #
        {data.puesto ?? '—'}
      </h1>
      <table className={CLASE_TABLA}>
        <thead>
          <tr className={CLASE_FILA}>
            <th className="p-2">Problema</th>
            <th className="p-2">Dificultad</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Duración</th>
            <th className="p-2">Enviado en</th>
          </tr>
        </thead>
        <tbody>
          {data.problemas.map((p) => (
            <Fragment key={p.problemaId}>
              <tr className={CLASE_FILA}>
                <td className="p-2">
                  {p.codigo && (
                    <button
                      className="mr-2 text-blue-600 underline"
                      onClick={() =>
                        setExpandido(
                          expandido === p.problemaId ? null : p.problemaId,
                        )
                      }
                    >
                      {expandido === p.problemaId ? '▾' : '▸'}
                    </button>
                  )}
                  {p.titulo}
                </td>
                <td className="p-2">{p.dificultad}</td>
                <td className="p-2">{ETIQUETAS_ESTADO[p.estadoProgreso]}</td>
                <td className="p-2">
                  {p.duracionMinutos !== null
                    ? `${p.duracionMinutos} min`
                    : '—'}
                </td>
                <td className="p-2">
                  {p.creadoEn ? new Date(p.creadoEn).toLocaleString() : '—'}
                </td>
              </tr>
              {expandido === p.problemaId && p.codigo && (
                <tr className={`${CLASE_FILA} bg-gray-50`}>
                  <td colSpan={5} className="p-2">
                    <p className="text-sm text-gray-600">
                      Lenguaje: {p.lenguaje}
                    </p>
                    <pre className="mt-1 whitespace-pre-wrap rounded bg-white p-2 text-sm">
                      {p.codigo}
                    </pre>
                    {p.resultados && (
                      <ul className="mt-2 flex flex-col gap-1 text-sm">
                        {p.resultados.map((r, i) => (
                          <li key={i}>
                            <code>{formatearArgumentos(r.argumentos)}</code> —
                            Esperado: <code>{r.salidaEsperada}</code> —
                            Obtenido:{' '}
                            <code>{r.salidaObtenida || r.salidaError}</code> —{' '}
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

- [ ] **Step 6: Agregar el enlace en `src/components/NavbarAdmin.tsx`**

```diff
   { to: '/admin/respuestas', etiqueta: 'Respuestas' },
+  { to: '/admin/historial', etiqueta: 'Historial' },
   { to: '/clasificacion', etiqueta: 'Clasificación' },
```

- [ ] **Step 7: Regenerar el árbol de rutas**

```bash
npm run generate-routes
```

- [ ] **Step 8: Verificación manual**

```bash
npm run dev
```

Como admin: crear un segundo torneo (tras concluir el actual), confirmar que el torneo anterior
aparece en `/admin/historial`, que su lista de resultados carga, y que el detalle de un
participante de ese torneo se ve correctamente sin ningún control de edición. Confirmar también
que `/admin/participantes`, `/admin/problemas` y `/admin/respuestas` ahora muestran datos del
torneo *nuevo* (vacío), y que intentar (vía consola del navegador o llamando la función
directamente) `actualizarEstadoProgreso`/`actualizarProblema`/`eliminarParticipante` sobre una
entidad del torneo viejo devuelve el error "Este torneo ya no se puede editar".

- [ ] **Step 9: Commit**

```bash
git add src/components/NavbarAdmin.tsx src/server/queries/torneo.ts src/server/queries/historial.ts src/routes/admin/historial src/routeTree.gen.ts
git commit -m "feat: agregar panel de historial de torneos de solo lectura"
```

---

## Task 13: Script de backfill y runbook de despliegue

**Files:**
- Create: `scripts/backfill-torneos.ts`
- Modify: `src/server/db/schema.ts`
- Modify: `docs/deployment.md`

**Interfaces:**
- Consumes: tabla `estado_torneo` (todavía presente hasta este task), tabla `torneos` (Task 1).
- Produces: script ejecutable una sola vez, documentación del runbook manual de producción.

**Nota crítica de orden:** este task **elimina** `estadoTorneo` de `schema.ts`. En producción, el
comando de deploy corre `npx drizzle-kit push && npm run start` automáticamente en cada deploy —
si el código que borra `estado_torneo` del esquema llega a producción antes de correr el backfill,
`drizzle-kit push` **dropeará la tabla `estado_torneo` con los datos reales del torneo en curso
antes de que el backfill pueda leerlos**. Por eso el backfill contra producción es un paso manual
que el usuario debe correr él mismo, en el momento del deploy real, siguiendo el runbook — nunca
lo ejecutes tú mismo contra producción como parte de este plan.

- [ ] **Step 1: Escribir el script de backfill**

Crear `scripts/backfill-torneos.ts`:

```ts
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db } from '../src/server/db/client'
import { torneos, usuarios, problemas, estadoTorneo } from '../src/server/db/schema'

async function main() {
  const torneosExistentes = await db.select().from(torneos)
  if (torneosExistentes.length > 0) {
    console.log('Ya existe al menos un torneo — no se hace nada.')
    return
  }

  const anioArg = process.argv[2]
  if (!anioArg || Number.isNaN(Number(anioArg))) {
    console.error('Uso: tsx scripts/backfill-torneos.ts <anio>')
    process.exitCode = 1
    return
  }
  const anio = Number(anioArg)

  const [estadoPrevio] = await db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))

  const id = crypto.randomUUID()
  await db.insert(torneos).values({
    id,
    anio,
    iniciadoEn: estadoPrevio?.iniciadoEn ?? null,
    finalizadoEn: estadoPrevio?.finalizadoEn ?? null,
  })
  console.log(`Torneo ${anio} creado con id ${id}.`)

  const participantesActualizados = await db
    .update(usuarios)
    .set({ torneoId: id })
    .where(eq(usuarios.rol, 'participante'))
  console.log('Participantes actualizados:', participantesActualizados[0].affectedRows)

  const problemasActualizados = await db.update(problemas).set({ torneoId: id })
  console.log('Problemas actualizados:', problemasActualizados[0].affectedRows)

  console.log('Backfill completo.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
```

- [ ] **Step 2: Probar el script contra la base de datos local**

```bash
npx tsx scripts/backfill-torneos.ts 2026
```

Expected: imprime "Torneo 2026 creado..." y las cantidades actualizadas (pueden ser 0 si la base
de datos local está vacía — está bien, el objetivo es confirmar que corre sin errores).

- [ ] **Step 3: Verificar el resultado**

```bash
npx vitest run tests/db.test.ts
```

Expected: PASS (confirma que la conexión y el esquema siguen sanos tras el backfill).

- [ ] **Step 4: Eliminar `estadoTorneo` de `src/server/db/schema.ts`**

Quitar por completo la definición:

```ts
export const estadoTorneo = mysqlTable('estado_torneo', {
  id: int('id').primaryKey().default(1),
  iniciadoEn: timestamp('iniciado_en'),
  finalizadoEn: timestamp('finalizado_en'),
})
```

- [ ] **Step 5: Quitar las referencias a `estadoTorneo` que queden**

Buscar y limpiar:

```bash
grep -rl "estadoTorneo" src/ scripts/ tests/
```

Expected después de los tasks anteriores: solo `scripts/backfill-torneos.ts` (Step 1 de este
task) y `tests/db.test.ts` (el `describe('conexión a la base de datos', ...)` original). En
`tests/db.test.ts`, eliminar el `describe('conexión a la base de datos', ...)` que inserta/lee
`estado_torneo` (ya no aplica) y quitar `estadoTorneo` de su import.

En `scripts/backfill-torneos.ts`, este script es de un solo uso — déjalo tal cual (referencia
histórica de cómo se hizo la migración), pero agrega un comentario al inicio aclarando que ya no
es ejecutable tal cual una vez que `estadoTorneo` se quite del esquema, y que su propósito es
documentar el proceso, no volver a correrse:

```ts
// Script de un solo uso, corrido durante la migración a soporte multi-torneo
// (2026-07). Lee la fila legacy de `estado_torneo` para crear el primer
// `torneos` — ya no es ejecutable tal cual porque `estadoTorneo` se quitó de
// schema.ts en el mismo cambio; se conserva como referencia del proceso.
```

- [ ] **Step 6: Aplicar el esquema final a desarrollo**

```bash
npx drizzle-kit push
```

Confirmar el prompt para dropear `estado_torneo` (solo en la base de datos de **desarrollo**).

- [ ] **Step 7: Correr toda la suite**

```bash
npm run test
```

Expected: PASS.

- [ ] **Step 8: Actualizar `docs/deployment.md` con el runbook de producción**

Agregar una nueva sección antes de "## Creating Admin Accounts Manually":

```markdown
## Migración a soporte multi-torneo (paso único, manual)

Este runbook aplica **una sola vez**, al desplegar la versión del sistema que agrega soporte para
múltiples torneos anuales (ver `docs/superpowers/specs/2026-07-19-torneos-multiples-design.md`).
Después de correrlo, los deploys normales (`npx drizzle-kit push && npm run start`) vuelven a ser
completamente automáticos.

**Por qué es manual:** el deploy command normal correría `drizzle-kit push` con el esquema final
(sin `estado_torneo`), lo que dropearía esa tabla — y con ella los datos del torneo en curso —
antes de que el script de backfill pueda leerlos. Este runbook evita ese orden.

1. Con `DATABASE_URL` apuntando a la base de datos de **producción** (no local), y usando el
   commit **anterior** al que elimina `estadoTorneo` de `src/server/db/schema.ts` (el que solo
   agrega `torneos`/`torneoId`/`correoOriginal` mantiene `estado_torneo` intacto):
   ```bash
   DATABASE_URL="<url de producción>" npx drizzle-kit push
   ```
   Confirmar el prompt — agrega tabla y columnas nuevas, no borra nada.
2. Correr el backfill contra producción, con el año del torneo actualmente en curso:
   ```bash
   DATABASE_URL="<url de producción>" npx tsx scripts/backfill-torneos.ts 2026
   ```
3. Verificar en la consola de MySQL de Railway que la tabla `torneos` tiene una fila, y que
   `usuarios`/`problemas` tienen `torneo_id` poblado.
4. Recién ahora, desplegar el commit final (el que elimina `estadoTorneo` de `schema.ts`) de la
   forma normal — su `drizzle-kit push` automático dropeará `estado_torneo`, que para este punto
   ya no tiene ningún dato que no se haya copiado a `torneos`.
```

- [ ] **Step 9: Commit**

```bash
git add scripts/backfill-torneos.ts src/server/db/schema.ts tests/db.test.ts docs/deployment.md
git commit -m "feat: script de backfill a torneos y runbook de migracion de produccion"
```

---

## Task 14: Verificación final

**Files:** ninguno (solo comandos de verificación).

- [ ] **Step 1: Suite completa de pruebas**

```bash
npm run test
```

Expected: PASS en todos los archivos.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: sin errores.

- [ ] **Step 3: Formato**

```bash
npm run check
```

Expected: sin diferencias.

- [ ] **Step 4: Build de producción**

```bash
npm run build
```

Expected: build exitoso, sin errores de tipos.

- [ ] **Step 5: Recorrido manual end-to-end**

```bash
npm run dev
```

Con la base de datos local ya con un torneo (del backfill de Task 13 o creado manualmente vía
`/admin/torneo`):

1. Como admin: iniciar el torneo, registrar un participante, crear un problema, verificar que
   aparece en `/admin/problemas` y `/clasificacion`.
2. Como el participante registrado: iniciar sesión, hacer check-in, resolver el problema con
   "Run", confirmar que aparece como completado.
3. Como admin: concluir el torneo, crear el torneo del año siguiente (año distinto), confirmar que
   `/admin/participantes` y `/admin/problemas` ahora están vacíos (torneo nuevo), y que el
   participante del torneo anterior aparece en `/admin/historial/<torneo-anterior>` con su
   progreso, de solo lectura.
4. Confirmar que el correo del participante archivado se liberó: registrar un participante nuevo
   con el mismo correo real en el torneo nuevo y verificar que no choca.

- [ ] **Step 6: Reportar resultado**

No hay commit en este task — es solo verificación. Si algo falla, volver al task correspondiente,
corregir, y repetir Steps 1–5 de este task.

---

## Cobertura del spec

- Tabla `torneos`, `torneoId`/`correoOriginal` en `usuarios`, `torneoId` en `problemas` → Task 1.
- "Torneo actual" derivado por `creadoEn` → Task 2.
- Bloqueo implícito de torneos no actuales → Tasks 2, 6, 8, 11 (guardas `asegurarEsTorneoActual`).
- `crearTorneo` exige `finalizadoEn` del torneo actual → Task 4.
- Archivado de correos/credenciales al crear un torneo nuevo → Tasks 3, 4.
- `crearCuentaParticipante` sin cambio de comportamiento para admins → Task 5.
- Panel de admin (`/admin/problemas`, `/admin/participantes`, `/admin/respuestas`) acotado al
  torneo actual sin cambio de ruta → Tasks 6, 7, 8, 11.
- `/admin/historial` de solo lectura → Task 12.
- Leaderboard público y progreso propio del participante → Task 7.
- Ejecución de código (`Run`) validada contra el torneo actual → Task 9.
- Asistente de invitado acotado al torneo propio → Task 10.
- Migración de datos existentes de producción → Task 13.
