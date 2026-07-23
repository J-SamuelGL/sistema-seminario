# Tablero de Clasificación Público Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/clasificacion` into a public (no-login), richer tournament dashboard: category
filters, a countdown, a live activity feed, ventaja/desventaja usage, per-problem stats
("resuelto por todos/nadie", "en llamas"), who's-solving-what, and IA-questions-remaining — all in
the existing dark "terminal" visual language.

**Architecture:** New read-only aggregation modules under `src/server/standings/` (pure calc +
DB loader pairs, mirroring the existing `calculate.ts`/`datos.ts` split), exposed as public
`createServerFn`s in `src/server/functions/leaderboard.ts`. The route moves out of the
authenticated `_app` group to a public top-level route. All panels are independent presentational
components wired together in one page component.

**Tech Stack:** TanStack Start/Router/Query, Drizzle ORM (MySQL), Tailwind v4, Vitest.

## Global Constraints

- All new identifiers, DB fields, and UI copy are in Spanish, per project convention.
- `src/server/functions/*.ts` files export **only** `createServerFn` values — enforced by
  `tests/funciones-solo-server-fn.test.ts`. All real logic goes in `src/server/standings/*.ts`.
- No `requerir*` auth check on any of the new server functions or the new route — this dashboard
  is intentionally public.
- The countdown is cosmetic only — it must never call `concluirTorneo` or otherwise mutate
  tournament state.
- `DURACION_TORNEO_MINUTOS = 180` is a fixed constant in code (not a DB column, not admin-configurable).
- "Actividad en vivo" window = 10 minutes (`VENTANA_ACTIVIDAD_MINUTOS`).
- "Actividad reciente" feed = last 15 `envios`.
- Truncated panel lists ("resuelto por todos/nadie") show at most 5 items + a "+N más" counter.
- No UI behavior is tested via browser automation — verify manually per task, per project convention.
- Do not modify `/admin/participantes` or `BeneficioAdminCelda` — the new panels are independent,
  read-only.

---

### Task 1: Estadísticas por problema — cálculo puro + carga desde BD

**Files:**
- Create: `src/server/standings/estadisticasProblemas.ts`
- Create: `src/server/standings/estadisticasProblemasDatos.ts`
- Test: `tests/standings-estadisticas-problemas.test.ts`
- Test: `tests/standings-estadisticas-problemas-datos.test.ts`

**Interfaces:**
- Consumes: `grupoDeCategoria(categoria: Categoria): Grupo` from `src/server/problems/grupo.ts`
  (already exists). `GRUPOS`, `Categoria`, `Grupo` from `src/shared/dominio.ts` (already exist).
  `db` from `src/server/db/client.ts`; `usuarios`, `envios`, `corridas`, `problemas` from
  `src/server/db/schema.ts` (all already exist).
- Produces: `calcularEstadisticasProblemas`, `problemasResueltosPorTodos`,
  `problemasResueltosPorNadie`, `problemaEnLlamasPorGrupo`, and type `EstadisticaProblema` from
  `estadisticasProblemas.ts`; `cargarEstadisticasProblemas(torneoId: string)` from
  `estadisticasProblemasDatos.ts`, returning
  `{ todas: EstadisticaProblema[]; resueltosPorTodos: EstadisticaProblema[]; resueltosPorNadie: EstadisticaProblema[]; enLlamasPorGrupo: Partial<Record<Grupo, EstadisticaProblema>> }`.
  Later tasks (5, 12) depend on these exact names.

- [ ] **Step 1: Write the failing unit tests for the pure calculation**

```ts
// tests/standings-estadisticas-problemas.test.ts
import { describe, it, expect } from 'vitest'
import {
  calcularEstadisticasProblemas,
  problemasResueltosPorTodos,
  problemasResueltosPorNadie,
  problemaEnLlamasPorGrupo,
} from '../src/server/standings/estadisticasProblemas'

const problemas = [
  { id: 'p1', titulo: 'Suma', grupo: 'invitado_junior' as const },
  { id: 'p2', titulo: 'Resta', grupo: 'senior' as const },
]

describe('calcularEstadisticasProblemas', () => {
  it('cuenta elegibles por grupo a partir de la categoría de cada usuario', () => {
    const stats = calcularEstadisticasProblemas(
      [{ categoria: 'invitado' }, { categoria: 'junior' }, { categoria: 'senior' }],
      [],
      [],
      problemas,
    )
    expect(stats.find((s) => s.problemaId === 'p1')?.elegibles).toBe(2)
    expect(stats.find((s) => s.problemaId === 'p2')?.elegibles).toBe(1)
  })

  it('cuenta resueltos como usuarios distintos con estado no pendiente', () => {
    const stats = calcularEstadisticasProblemas(
      [{ categoria: 'invitado' }, { categoria: 'invitado' }],
      [
        { usuarioId: 'u1', problemaId: 'p1', estadoProgreso: 'completado' },
        { usuarioId: 'u1', problemaId: 'p1', estadoProgreso: 'completado' },
        { usuarioId: 'u2', problemaId: 'p1', estadoProgreso: 'pendiente' },
      ],
      [],
      problemas,
    )
    expect(stats.find((s) => s.problemaId === 'p1')?.resueltos).toBe(1)
  })

  it('calcula tasaAciertos sobre participantes con al menos un intento', () => {
    const stats = calcularEstadisticasProblemas(
      [{ categoria: 'invitado' }],
      [{ usuarioId: 'u1', problemaId: 'p1', estadoProgreso: 'completado' }],
      [
        { usuarioId: 'u1', problemaId: 'p1', contador: 3 },
        { usuarioId: 'u2', problemaId: 'p1', contador: 5 },
      ],
      problemas,
    )
    const p1 = stats.find((s) => s.problemaId === 'p1')!
    expect(p1.intentosTotales).toBe(8)
    expect(p1.tasaAciertos).toBeCloseTo(0.5)
  })

  it('devuelve tasaAciertos 0 si nadie ha intentado', () => {
    const stats = calcularEstadisticasProblemas([], [], [], problemas)
    expect(stats.every((s) => s.tasaAciertos === 0)).toBe(true)
  })
})

describe('problemasResueltosPorTodos / problemasResueltosPorNadie', () => {
  const base = [
    {
      problemaId: 'p1',
      titulo: 'Suma',
      grupo: 'invitado_junior' as const,
      elegibles: 2,
      resueltos: 2,
      intentosTotales: 4,
      tasaAciertos: 1,
    },
    {
      problemaId: 'p2',
      titulo: 'Resta',
      grupo: 'senior' as const,
      elegibles: 3,
      resueltos: 0,
      intentosTotales: 0,
      tasaAciertos: 0,
    },
  ]

  it('identifica el problema resuelto por todos los elegibles', () => {
    expect(problemasResueltosPorTodos(base).map((s) => s.problemaId)).toEqual(['p1'])
  })

  it('identifica el problema que nadie ha resuelto', () => {
    expect(problemasResueltosPorNadie(base).map((s) => s.problemaId)).toEqual(['p2'])
  })
})

describe('problemaEnLlamasPorGrupo', () => {
  it('elige, por grupo, el problema con más fallos acumulados', () => {
    const stats = [
      {
        problemaId: 'p1',
        titulo: 'Fácil',
        grupo: 'invitado_junior' as const,
        elegibles: 5,
        resueltos: 4,
        intentosTotales: 6,
        tasaAciertos: 0.8,
      },
      {
        problemaId: 'p2',
        titulo: 'Difícil',
        grupo: 'invitado_junior' as const,
        elegibles: 5,
        resueltos: 1,
        intentosTotales: 20,
        tasaAciertos: 0.2,
      },
    ]
    const resultado = problemaEnLlamasPorGrupo(stats)
    expect(resultado.invitado_junior?.problemaId).toBe('p2')
    expect(resultado.senior).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/standings-estadisticas-problemas.test.ts`
Expected: FAIL — cannot find module `../src/server/standings/estadisticasProblemas`

- [ ] **Step 3: Implement the pure calculation module**

```ts
// src/server/standings/estadisticasProblemas.ts
import type { Categoria, Grupo } from '../../shared/dominio'
import { GRUPOS } from '../../shared/dominio'
import { grupoDeCategoria } from '../problems/grupo'

export type RegistroUsuarioElegible = {
  categoria: Categoria
}

export type RegistroEnvioProblema = {
  usuarioId: string
  problemaId: string
  estadoProgreso: 'pendiente' | 'completado' | 'aprobado_manual'
}

export type RegistroCorridaProblema = {
  usuarioId: string
  problemaId: string
  contador: number
}

export type RegistroProblemaInfo = {
  id: string
  titulo: string
  grupo: Grupo
}

export type EstadisticaProblema = {
  problemaId: string
  titulo: string
  grupo: Grupo
  elegibles: number
  resueltos: number
  intentosTotales: number
  tasaAciertos: number
}

export function calcularEstadisticasProblemas(
  usuarios: RegistroUsuarioElegible[],
  envios: RegistroEnvioProblema[],
  corridas: RegistroCorridaProblema[],
  problemas: RegistroProblemaInfo[],
): EstadisticaProblema[] {
  const elegiblesPorGrupo = new Map<Grupo, number>()
  for (const u of usuarios) {
    const grupo = grupoDeCategoria(u.categoria)
    elegiblesPorGrupo.set(grupo, (elegiblesPorGrupo.get(grupo) ?? 0) + 1)
  }

  const resueltosPorProblema = new Map<string, Set<string>>()
  for (const e of envios) {
    if (e.estadoProgreso === 'pendiente') continue
    if (!resueltosPorProblema.has(e.problemaId)) {
      resueltosPorProblema.set(e.problemaId, new Set())
    }
    resueltosPorProblema.get(e.problemaId)!.add(e.usuarioId)
  }

  const intentosPorProblema = new Map<string, number>()
  const participantesConIntentoPorProblema = new Map<string, Set<string>>()
  for (const c of corridas) {
    if (c.contador <= 0) continue
    intentosPorProblema.set(
      c.problemaId,
      (intentosPorProblema.get(c.problemaId) ?? 0) + c.contador,
    )
    if (!participantesConIntentoPorProblema.has(c.problemaId)) {
      participantesConIntentoPorProblema.set(c.problemaId, new Set())
    }
    participantesConIntentoPorProblema.get(c.problemaId)!.add(c.usuarioId)
  }

  return problemas.map((p): EstadisticaProblema => {
    const resueltos = resueltosPorProblema.get(p.id)?.size ?? 0
    const intentosTotales = intentosPorProblema.get(p.id) ?? 0
    const participantesConIntento = participantesConIntentoPorProblema.get(p.id)?.size ?? 0
    return {
      problemaId: p.id,
      titulo: p.titulo,
      grupo: p.grupo,
      elegibles: elegiblesPorGrupo.get(p.grupo) ?? 0,
      resueltos,
      intentosTotales,
      tasaAciertos: participantesConIntento > 0 ? resueltos / participantesConIntento : 0,
    }
  })
}

export function problemasResueltosPorTodos(stats: EstadisticaProblema[]): EstadisticaProblema[] {
  return stats.filter((s) => s.elegibles > 0 && s.resueltos >= s.elegibles)
}

export function problemasResueltosPorNadie(stats: EstadisticaProblema[]): EstadisticaProblema[] {
  return stats.filter((s) => s.resueltos === 0)
}

/** "En llamas" es una heurística, no una métrica exacta: aproxima "fallos
 * acumulados" como intentosTotales - resueltos (usuarios distintos), y usa
 * tasaAciertos como desempate — suficiente para un panel de exhibición en
 * vivo, no para análisis estadístico. */
export function problemaEnLlamasPorGrupo(
  stats: EstadisticaProblema[],
): Partial<Record<Grupo, EstadisticaProblema>> {
  const resultado: Partial<Record<Grupo, EstadisticaProblema>> = {}
  for (const grupo of GRUPOS) {
    const candidatos = stats.filter((s) => s.grupo === grupo && s.intentosTotales > 0)
    if (candidatos.length === 0) continue
    candidatos.sort((a, b) => {
      const fallosA = a.intentosTotales - a.resueltos
      const fallosB = b.intentosTotales - b.resueltos
      if (fallosB !== fallosA) return fallosB - fallosA
      return a.tasaAciertos - b.tasaAciertos
    })
    resultado[grupo] = candidatos[0]
  }
  return resultado
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/standings-estadisticas-problemas.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Write the failing DB-loader test**

```ts
// tests/standings-estadisticas-problemas-datos.test.ts
import { describe, it, expect } from 'vitest'
import { db } from '../src/server/db/client'
import { torneos, usuarios, problemas, envios, corridas } from '../src/server/db/schema'
import { cargarEstadisticasProblemas } from '../src/server/standings/estadisticasProblemasDatos'

describe('cargarEstadisticasProblemas', () => {
  it('agrega estadísticas por problema solo del torneo dado', async () => {
    const torneoId = crypto.randomUUID()
    await db.insert(torneos).values({
      id: torneoId,
      anio: 1400 + Math.floor(Math.random() * 100),
    })

    const usuarioA = crypto.randomUUID()
    const usuarioB = crypto.randomUUID()
    await db.insert(usuarios).values([
      {
        id: usuarioA,
        name: 'A',
        email: `a-${usuarioA}@example.com`,
        categoria: 'invitado',
        torneoId,
      },
      {
        id: usuarioB,
        name: 'B',
        email: `b-${usuarioB}@example.com`,
        categoria: 'invitado',
        torneoId,
      },
    ])

    const problemaId = crypto.randomUUID()
    await db.insert(problemas).values({
      id: problemaId,
      titulo: 'Suma',
      descripcion: 'd',
      dificultad: 'Fácil',
      grupo: 'invitado_junior',
      puntos: 10,
      parametros: [],
      tipoRetorno: 'int',
      torneoId,
    })

    await db.insert(envios).values({
      usuarioId: usuarioA,
      problemaId,
      codigo: 'c',
      lenguaje: 'python',
      estadoProgreso: 'completado',
    })
    await db.insert(corridas).values([
      { usuarioId: usuarioA, problemaId, contador: 2 },
      { usuarioId: usuarioB, problemaId, contador: 3 },
    ])

    const resultado = await cargarEstadisticasProblemas(torneoId)
    const stat = resultado.todas.find((s) => s.problemaId === problemaId)
    expect(stat).toMatchObject({ elegibles: 2, resueltos: 1, intentosTotales: 5 })
    expect(resultado.resueltosPorNadie).toEqual([])
  })
})
```

- [ ] **Step 6: Run the DB test to verify it fails**

Run: `npx vitest run tests/standings-estadisticas-problemas-datos.test.ts`
Expected: FAIL — cannot find module `../src/server/standings/estadisticasProblemasDatos`

- [ ] **Step 7: Implement the DB loader**

```ts
// src/server/standings/estadisticasProblemasDatos.ts
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios, envios, corridas, problemas } from '../db/schema'
import {
  calcularEstadisticasProblemas,
  problemasResueltosPorTodos,
  problemasResueltosPorNadie,
  problemaEnLlamasPorGrupo,
} from './estadisticasProblemas'

export async function cargarEstadisticasProblemas(torneoId: string) {
  const [todosUsuarios, todosProblemas] = await Promise.all([
    db
      .select({ categoria: usuarios.categoria })
      .from(usuarios)
      .where(and(eq(usuarios.torneoId, torneoId), eq(usuarios.rol, 'participante'))),
    db
      .select({ id: problemas.id, titulo: problemas.titulo, grupo: problemas.grupo })
      .from(problemas)
      .where(eq(problemas.torneoId, torneoId)),
  ])

  const idsProblemas = todosProblemas.map((p) => p.id)
  const [todosEnvios, todasCorridas] =
    idsProblemas.length > 0
      ? await Promise.all([
          db
            .select({
              usuarioId: envios.usuarioId,
              problemaId: envios.problemaId,
              estadoProgreso: envios.estadoProgreso,
            })
            .from(envios)
            .where(inArray(envios.problemaId, idsProblemas)),
          db
            .select({
              usuarioId: corridas.usuarioId,
              problemaId: corridas.problemaId,
              contador: corridas.contador,
            })
            .from(corridas)
            .where(inArray(corridas.problemaId, idsProblemas)),
        ])
      : [[], []]

  const todas = calcularEstadisticasProblemas(todosUsuarios, todosEnvios, todasCorridas, todosProblemas)

  return {
    todas,
    resueltosPorTodos: problemasResueltosPorTodos(todas),
    resueltosPorNadie: problemasResueltosPorNadie(todas),
    enLlamasPorGrupo: problemaEnLlamasPorGrupo(todas),
  }
}
```

- [ ] **Step 8: Run the DB test to verify it passes**

Run: `npx vitest run tests/standings-estadisticas-problemas-datos.test.ts`
Expected: PASS (requires `DATABASE_URL` pointing at a running MySQL, per project convention)

- [ ] **Step 9: Commit**

```bash
git add src/server/standings/estadisticasProblemas.ts src/server/standings/estadisticasProblemasDatos.ts tests/standings-estadisticas-problemas.test.ts tests/standings-estadisticas-problemas-datos.test.ts
git commit -m "feat: agregar estadisticas por problema para el tablero publico"
```

---

### Task 2: Actividad en vivo — cálculo puro + carga desde BD

**Files:**
- Create: `src/server/standings/actividadEnVivo.ts`
- Create: `src/server/standings/actividadEnVivoDatos.ts`
- Test: `tests/standings-actividad-en-vivo.test.ts`
- Test: `tests/standings-actividad-en-vivo-datos.test.ts`

**Interfaces:**
- Consumes: `db`, `usuarios`, `corridas`, `problemas` from `src/server/db/schema.ts`/`db/client.ts`.
- Produces: `calcularActividadEnVivo(corridas, ahora, ventanaMinutos)`, type `ActividadEnVivo`
  (`{ usuarioId, usuarioNombre, usuarioCategoria, problemaTitulo }`) from `actividadEnVivo.ts`;
  `cargarActividadEnVivo(torneoId: string): Promise<ActividadEnVivo[]>` from
  `actividadEnVivoDatos.ts`. Tasks 5 and 13 depend on these exact names.

- [ ] **Step 1: Write the failing unit tests for the pure calculation**

```ts
// tests/standings-actividad-en-vivo.test.ts
import { describe, it, expect } from 'vitest'
import { calcularActividadEnVivo } from '../src/server/standings/actividadEnVivo'

const ahora = new Date('2026-07-23T15:00:00Z')

describe('calcularActividadEnVivo', () => {
  it('incluye una corrida dentro de la ventana', () => {
    const resultado = calcularActividadEnVivo(
      [
        {
          usuarioId: 'u1',
          usuarioNombre: 'Ana',
          usuarioCategoria: 'invitado',
          problemaTitulo: 'Suma',
          ultimaEjecucionEn: new Date('2026-07-23T14:55:00Z'),
        },
      ],
      ahora,
      10,
    )
    expect(resultado).toEqual([
      { usuarioId: 'u1', usuarioNombre: 'Ana', usuarioCategoria: 'invitado', problemaTitulo: 'Suma' },
    ])
  })

  it('excluye una corrida fuera de la ventana', () => {
    const resultado = calcularActividadEnVivo(
      [
        {
          usuarioId: 'u1',
          usuarioNombre: 'Ana',
          usuarioCategoria: 'invitado',
          problemaTitulo: 'Suma',
          ultimaEjecucionEn: new Date('2026-07-23T14:40:00Z'),
        },
      ],
      ahora,
      10,
    )
    expect(resultado).toEqual([])
  })

  it('se queda solo con la corrida más reciente por usuario', () => {
    const resultado = calcularActividadEnVivo(
      [
        {
          usuarioId: 'u1',
          usuarioNombre: 'Ana',
          usuarioCategoria: 'invitado',
          problemaTitulo: 'Suma',
          ultimaEjecucionEn: new Date('2026-07-23T14:50:00Z'),
        },
        {
          usuarioId: 'u1',
          usuarioNombre: 'Ana',
          usuarioCategoria: 'invitado',
          problemaTitulo: 'Resta',
          ultimaEjecucionEn: new Date('2026-07-23T14:58:00Z'),
        },
      ],
      ahora,
      10,
    )
    expect(resultado).toEqual([
      { usuarioId: 'u1', usuarioNombre: 'Ana', usuarioCategoria: 'invitado', problemaTitulo: 'Resta' },
    ])
  })

  it('ignora corridas sin ultimaEjecucionEn', () => {
    const resultado = calcularActividadEnVivo(
      [
        {
          usuarioId: 'u1',
          usuarioNombre: 'Ana',
          usuarioCategoria: 'invitado',
          problemaTitulo: 'Suma',
          ultimaEjecucionEn: null,
        },
      ],
      ahora,
      10,
    )
    expect(resultado).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/standings-actividad-en-vivo.test.ts`
Expected: FAIL — cannot find module `../src/server/standings/actividadEnVivo`

- [ ] **Step 3: Implement the pure calculation module**

```ts
// src/server/standings/actividadEnVivo.ts
import type { Categoria } from '../../shared/dominio'

export type RegistroCorridaActividad = {
  usuarioId: string
  usuarioNombre: string
  usuarioCategoria: Categoria
  problemaTitulo: string
  ultimaEjecucionEn: Date | null
}

export type ActividadEnVivo = {
  usuarioId: string
  usuarioNombre: string
  usuarioCategoria: Categoria
  problemaTitulo: string
}

export function calcularActividadEnVivo(
  corridas: RegistroCorridaActividad[],
  ahora: Date,
  ventanaMinutos: number,
): ActividadEnVivo[] {
  const limite = ahora.getTime() - ventanaMinutos * 60000
  const masRecientePorUsuario = new Map<string, RegistroCorridaActividad>()

  for (const c of corridas) {
    if (!c.ultimaEjecucionEn) continue
    const actual = masRecientePorUsuario.get(c.usuarioId)
    if (!actual || c.ultimaEjecucionEn.getTime() > actual.ultimaEjecucionEn!.getTime()) {
      masRecientePorUsuario.set(c.usuarioId, c)
    }
  }

  return [...masRecientePorUsuario.values()]
    .filter((c) => c.ultimaEjecucionEn!.getTime() >= limite)
    .map((c) => ({
      usuarioId: c.usuarioId,
      usuarioNombre: c.usuarioNombre,
      usuarioCategoria: c.usuarioCategoria,
      problemaTitulo: c.problemaTitulo,
    }))
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/standings-actividad-en-vivo.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the failing DB-loader test**

```ts
// tests/standings-actividad-en-vivo-datos.test.ts
import { describe, it, expect } from 'vitest'
import { db } from '../src/server/db/client'
import { torneos, usuarios, problemas, corridas } from '../src/server/db/schema'
import { cargarActividadEnVivo } from '../src/server/standings/actividadEnVivoDatos'

describe('cargarActividadEnVivo', () => {
  it('incluye solo corridas recientes del torneo dado', async () => {
    const torneoId = crypto.randomUUID()
    await db.insert(torneos).values({
      id: torneoId,
      anio: 1500 + Math.floor(Math.random() * 100),
    })

    const usuarioReciente = crypto.randomUUID()
    const usuarioViejo = crypto.randomUUID()
    await db.insert(usuarios).values([
      {
        id: usuarioReciente,
        name: 'Reciente',
        email: `r-${usuarioReciente}@example.com`,
        categoria: 'invitado',
        torneoId,
      },
      {
        id: usuarioViejo,
        name: 'Viejo',
        email: `v-${usuarioViejo}@example.com`,
        categoria: 'invitado',
        torneoId,
      },
    ])

    const problemaId = crypto.randomUUID()
    await db.insert(problemas).values({
      id: problemaId,
      titulo: 'Suma',
      descripcion: 'd',
      dificultad: 'Fácil',
      grupo: 'invitado_junior',
      puntos: 10,
      parametros: [],
      tipoRetorno: 'int',
      torneoId,
    })

    const ahora = new Date()
    const haceUnMinuto = new Date(ahora.getTime() - 60000)
    const haceUnaHora = new Date(ahora.getTime() - 3600000)

    await db.insert(corridas).values([
      { usuarioId: usuarioReciente, problemaId, contador: 1, ultimaEjecucionEn: haceUnMinuto },
      { usuarioId: usuarioViejo, problemaId, contador: 1, ultimaEjecucionEn: haceUnaHora },
    ])

    const resultado = await cargarActividadEnVivo(torneoId)
    expect(resultado.map((r) => r.usuarioId)).toEqual([usuarioReciente])
  })
})
```

- [ ] **Step 6: Run the DB test to verify it fails**

Run: `npx vitest run tests/standings-actividad-en-vivo-datos.test.ts`
Expected: FAIL — cannot find module `../src/server/standings/actividadEnVivoDatos`

- [ ] **Step 7: Implement the DB loader**

```ts
// src/server/standings/actividadEnVivoDatos.ts
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios, corridas, problemas } from '../db/schema'
import { calcularActividadEnVivo } from './actividadEnVivo'
import type { RegistroCorridaActividad } from './actividadEnVivo'

const VENTANA_ACTIVIDAD_MINUTOS = 10

export async function cargarActividadEnVivo(torneoId: string) {
  const filas: RegistroCorridaActividad[] = await db
    .select({
      usuarioId: corridas.usuarioId,
      usuarioNombre: usuarios.name,
      usuarioCategoria: usuarios.categoria,
      problemaTitulo: problemas.titulo,
      ultimaEjecucionEn: corridas.ultimaEjecucionEn,
    })
    .from(corridas)
    .innerJoin(usuarios, eq(usuarios.id, corridas.usuarioId))
    .innerJoin(problemas, eq(problemas.id, corridas.problemaId))
    .where(eq(usuarios.torneoId, torneoId))

  return calcularActividadEnVivo(filas, new Date(), VENTANA_ACTIVIDAD_MINUTOS)
}
```

- [ ] **Step 8: Run the DB test to verify it passes**

Run: `npx vitest run tests/standings-actividad-en-vivo-datos.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/server/standings/actividadEnVivo.ts src/server/standings/actividadEnVivoDatos.ts tests/standings-actividad-en-vivo.test.ts tests/standings-actividad-en-vivo-datos.test.ts
git commit -m "feat: agregar deteccion de actividad en vivo para el tablero publico"
```

---

### Task 3: Actividad reciente — carga desde BD

**Files:**
- Create: `src/server/standings/actividadRecienteDatos.ts`
- Test: `tests/standings-actividad-reciente-datos.test.ts`

**Interfaces:**
- Consumes: `db`, `usuarios`, `envios`, `problemas` from schema/client.
- Produces: `cargarActividadReciente(torneoId: string, limite: number): Promise<ActividadRecienteItem[]>`
  and type `ActividadRecienteItem`
  (`{ usuarioId, usuarioNombre, usuarioCategoria, problemaTitulo, puntos, creadoEn: Date }`).
  Tasks 5 and 10 depend on these exact names.

- [ ] **Step 1: Write the failing DB test**

```ts
// tests/standings-actividad-reciente-datos.test.ts
import { describe, it, expect } from 'vitest'
import { db } from '../src/server/db/client'
import { torneos, usuarios, problemas, envios } from '../src/server/db/schema'
import { cargarActividadReciente } from '../src/server/standings/actividadRecienteDatos'

describe('cargarActividadReciente', () => {
  it('devuelve solo envíos resueltos del torneo dado, más recientes primero', async () => {
    const torneoId = crypto.randomUUID()
    const otroTorneoId = crypto.randomUUID()
    await db.insert(torneos).values([
      { id: torneoId, anio: 1600 + Math.floor(Math.random() * 100) },
      { id: otroTorneoId, anio: 1800 + Math.floor(Math.random() * 100) },
    ])

    const usuarioId = crypto.randomUUID()
    const usuarioOtroTorneo = crypto.randomUUID()
    await db.insert(usuarios).values([
      {
        id: usuarioId,
        name: 'Ana',
        email: `a-${usuarioId}@example.com`,
        categoria: 'invitado',
        torneoId,
      },
      {
        id: usuarioOtroTorneo,
        name: 'Beto',
        email: `b-${usuarioOtroTorneo}@example.com`,
        categoria: 'invitado',
        torneoId: otroTorneoId,
      },
    ])

    const problemaViejo = crypto.randomUUID()
    const problemaNuevo = crypto.randomUUID()
    const problemaOtroTorneo = crypto.randomUUID()
    await db.insert(problemas).values([
      {
        id: problemaViejo,
        titulo: 'Viejo',
        descripcion: 'd',
        dificultad: 'Fácil',
        grupo: 'invitado_junior',
        puntos: 10,
        parametros: [],
        tipoRetorno: 'int',
        torneoId,
      },
      {
        id: problemaNuevo,
        titulo: 'Nuevo',
        descripcion: 'd',
        dificultad: 'Fácil',
        grupo: 'invitado_junior',
        puntos: 10,
        parametros: [],
        tipoRetorno: 'int',
        torneoId,
      },
      {
        id: problemaOtroTorneo,
        titulo: 'OtroTorneo',
        descripcion: 'd',
        dificultad: 'Fácil',
        grupo: 'invitado_junior',
        puntos: 10,
        parametros: [],
        tipoRetorno: 'int',
        torneoId: otroTorneoId,
      },
    ])

    await db.insert(envios).values([
      {
        usuarioId,
        problemaId: problemaViejo,
        codigo: 'c',
        lenguaje: 'python',
        estadoProgreso: 'completado',
        creadoEn: new Date('2026-07-23T10:00:00Z'),
      },
      {
        usuarioId,
        problemaId: problemaNuevo,
        codigo: 'c',
        lenguaje: 'python',
        estadoProgreso: 'aprobado_manual',
        creadoEn: new Date('2026-07-23T11:00:00Z'),
      },
      {
        usuarioId: usuarioOtroTorneo,
        problemaId: problemaOtroTorneo,
        codigo: 'c',
        lenguaje: 'python',
        estadoProgreso: 'completado',
        creadoEn: new Date('2026-07-23T12:00:00Z'),
      },
    ])

    const resultado = await cargarActividadReciente(torneoId, 15)
    expect(resultado.map((r) => r.problemaTitulo)).toEqual(['Nuevo', 'Viejo'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/standings-actividad-reciente-datos.test.ts`
Expected: FAIL — cannot find module `../src/server/standings/actividadRecienteDatos`

- [ ] **Step 3: Implement the loader**

```ts
// src/server/standings/actividadRecienteDatos.ts
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios, envios, problemas } from '../db/schema'
import type { Categoria } from '../../shared/dominio'

export type ActividadRecienteItem = {
  usuarioId: string
  usuarioNombre: string
  usuarioCategoria: Categoria
  problemaTitulo: string
  puntos: number
  creadoEn: Date
}

export async function cargarActividadReciente(
  torneoId: string,
  limite: number,
): Promise<ActividadRecienteItem[]> {
  return db
    .select({
      usuarioId: envios.usuarioId,
      usuarioNombre: usuarios.name,
      usuarioCategoria: usuarios.categoria,
      problemaTitulo: problemas.titulo,
      puntos: problemas.puntos,
      creadoEn: envios.creadoEn,
    })
    .from(envios)
    .innerJoin(usuarios, eq(usuarios.id, envios.usuarioId))
    .innerJoin(problemas, eq(problemas.id, envios.problemaId))
    .where(
      and(eq(usuarios.torneoId, torneoId), inArray(envios.estadoProgreso, ['completado', 'aprobado_manual'])),
    )
    .orderBy(desc(envios.creadoEn))
    .limit(limite)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/standings-actividad-reciente-datos.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/standings/actividadRecienteDatos.ts tests/standings-actividad-reciente-datos.test.ts
git commit -m "feat: agregar carga de actividad reciente para el tablero publico"
```

---

### Task 4: Beneficios usados + cupo de IA restante — carga desde BD

**Files:**
- Create: `src/server/standings/beneficiosUsadosDatos.ts`
- Test: `tests/standings-beneficios-usados-datos.test.ts`

**Interfaces:**
- Consumes: `db`, `usuarios`, `beneficios` from schema/client; `alias` from `drizzle-orm/mysql-core`
  (same pattern as `src/server/functions/participantes.ts:118-134`); `LIMITE_PREGUNTAS_IA` from
  `src/server/assistant/limit.ts` (already exists); `ClaveBeneficio`, `Ingeniero` types from
  `src/shared/beneficios.ts` (already exist).
- Produces: `cargarBeneficiosUsados(torneoId): Promise<BeneficioUsadoItem[]>`,
  `cargarCupoIaRestante(torneoId): Promise<CupoIaItem[]>`, and types `BeneficioUsadoItem`
  (`{ usuarioId, usuarioNombre, usuarioCategoria, clave, usadoEn: Date | null, objetivoUsuarioNombre: string | null, objetivoIngeniero: Ingeniero | null }`)
  and `CupoIaItem` (`{ usuarioId, usuarioNombre, preguntasRestantes }`). Tasks 5 and 11 depend on
  these exact names.

- [ ] **Step 1: Write the failing DB test**

```ts
// tests/standings-beneficios-usados-datos.test.ts
import { describe, it, expect } from 'vitest'
import { db } from '../src/server/db/client'
import { torneos, usuarios, beneficios } from '../src/server/db/schema'
import {
  cargarBeneficiosUsados,
  cargarCupoIaRestante,
} from '../src/server/standings/beneficiosUsadosDatos'

describe('cargarBeneficiosUsados', () => {
  it('incluye el nombre del objetivo cuando el beneficio ya se usó', async () => {
    const torneoId = crypto.randomUUID()
    await db.insert(torneos).values({ id: torneoId, anio: 1700 + Math.floor(Math.random() * 100) })

    const usuarioId = crypto.randomUUID()
    const objetivoId = crypto.randomUUID()
    await db.insert(usuarios).values([
      {
        id: usuarioId,
        name: 'Ana',
        email: `a-${usuarioId}@example.com`,
        categoria: 'senior',
        torneoId,
      },
      {
        id: objetivoId,
        name: 'Beto',
        email: `b-${objetivoId}@example.com`,
        categoria: 'senior',
        torneoId,
      },
    ])

    await db.insert(beneficios).values({
      usuarioId,
      clave: 'salir_caminar',
      usadoEn: new Date('2026-07-23T10:00:00Z'),
      objetivoUsuarioId: objetivoId,
    })

    const resultado = await cargarBeneficiosUsados(torneoId)
    expect(resultado).toEqual([
      expect.objectContaining({
        usuarioId,
        usuarioNombre: 'Ana',
        clave: 'salir_caminar',
        objetivoUsuarioNombre: 'Beto',
      }),
    ])
  })
})

describe('cargarCupoIaRestante', () => {
  it('calcula el cupo restante solo para participantes invitado', async () => {
    const torneoId = crypto.randomUUID()
    await db.insert(torneos).values({ id: torneoId, anio: 1900 + Math.floor(Math.random() * 100) })

    const invitadoId = crypto.randomUUID()
    const seniorId = crypto.randomUUID()
    await db.insert(usuarios).values([
      {
        id: invitadoId,
        name: 'Invitada',
        email: `i-${invitadoId}@example.com`,
        categoria: 'invitado',
        torneoId,
        preguntasIaUsadas: 1,
      },
      {
        id: seniorId,
        name: 'Senior',
        email: `s-${seniorId}@example.com`,
        categoria: 'senior',
        torneoId,
        preguntasIaUsadas: 1,
      },
    ])

    const resultado = await cargarCupoIaRestante(torneoId)
    expect(resultado).toEqual([
      { usuarioId: invitadoId, usuarioNombre: 'Invitada', preguntasRestantes: 2 },
    ])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/standings-beneficios-usados-datos.test.ts`
Expected: FAIL — cannot find module `../src/server/standings/beneficiosUsadosDatos`

- [ ] **Step 3: Implement the loader**

```ts
// src/server/standings/beneficiosUsadosDatos.ts
import { and, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/mysql-core'
import { db } from '../db/client'
import { usuarios, beneficios } from '../db/schema'
import { LIMITE_PREGUNTAS_IA } from '../assistant/limit'
import type { ClaveBeneficio, Ingeniero } from '../../shared/beneficios'
import type { Categoria } from '../../shared/dominio'

export type BeneficioUsadoItem = {
  usuarioId: string
  usuarioNombre: string
  usuarioCategoria: Categoria
  clave: ClaveBeneficio
  usadoEn: Date | null
  objetivoUsuarioNombre: string | null
  objetivoIngeniero: Ingeniero | null
}

export async function cargarBeneficiosUsados(torneoId: string): Promise<BeneficioUsadoItem[]> {
  const objetivoUsuario = alias(usuarios, 'objetivoUsuario')
  return db
    .select({
      usuarioId: beneficios.usuarioId,
      usuarioNombre: usuarios.name,
      usuarioCategoria: usuarios.categoria,
      clave: beneficios.clave,
      usadoEn: beneficios.usadoEn,
      objetivoUsuarioNombre: objetivoUsuario.name,
      objetivoIngeniero: beneficios.objetivoIngeniero,
    })
    .from(beneficios)
    .innerJoin(usuarios, eq(usuarios.id, beneficios.usuarioId))
    .leftJoin(objetivoUsuario, eq(objetivoUsuario.id, beneficios.objetivoUsuarioId))
    .where(eq(usuarios.torneoId, torneoId))
}

export type CupoIaItem = {
  usuarioId: string
  usuarioNombre: string
  preguntasRestantes: number
}

export async function cargarCupoIaRestante(torneoId: string): Promise<CupoIaItem[]> {
  const filas = await db
    .select({
      usuarioId: usuarios.id,
      usuarioNombre: usuarios.name,
      preguntasIaUsadas: usuarios.preguntasIaUsadas,
    })
    .from(usuarios)
    .where(
      and(
        eq(usuarios.torneoId, torneoId),
        eq(usuarios.categoria, 'invitado'),
        eq(usuarios.rol, 'participante'),
      ),
    )

  return filas.map((f) => ({
    usuarioId: f.usuarioId,
    usuarioNombre: f.usuarioNombre,
    preguntasRestantes: Math.max(LIMITE_PREGUNTAS_IA - f.preguntasIaUsadas, 0),
  }))
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/standings-beneficios-usados-datos.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/standings/beneficiosUsadosDatos.ts tests/standings-beneficios-usados-datos.test.ts
git commit -m "feat: agregar carga de beneficios usados y cupo de IA para el tablero publico"
```

---

### Task 5: Server functions públicas + query options

**Files:**
- Modify: `src/server/functions/leaderboard.ts`
- Create: `src/server/queries/tablero.ts`

**Interfaces:**
- Consumes: `cargarEstadisticasProblemas` (Task 1), `cargarActividadEnVivo` (Task 2),
  `cargarActividadReciente` (Task 3), `cargarBeneficiosUsados`/`cargarCupoIaRestante` (Task 4),
  `obtenerTorneoActual` (existing).
- Produces: `createServerFn`s `obtenerActividadReciente`, `obtenerBeneficiosUsados`,
  `obtenerEstadisticasProblemas`, `obtenerActividadEnVivo` from `functions/leaderboard.ts`; query
  option factories `actividadRecienteQueryOptions`, `beneficiosUsadosQueryOptions`,
  `estadisticasProblemasQueryOptions`, `actividadEnVivoQueryOptions` from `queries/tablero.ts`.
  Task 15 depends on these exact names.

- [ ] **Step 1: Rewrite `src/server/functions/leaderboard.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { agruparClasificacionPorCategoria } from '../standings/calculate'
import { cargarDatosClasificacion } from '../standings/datos'
import { cargarEstadisticasProblemas } from '../standings/estadisticasProblemasDatos'
import { cargarActividadEnVivo } from '../standings/actividadEnVivoDatos'
import { cargarActividadReciente } from '../standings/actividadRecienteDatos'
import { cargarBeneficiosUsados, cargarCupoIaRestante } from '../standings/beneficiosUsadosDatos'
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

export const obtenerActividadReciente = createServerFn({ method: 'GET' }).handler(
  async () => {
    const torneo = await obtenerTorneoActual()
    if (!torneo) return []
    return cargarActividadReciente(torneo.id, 15)
  },
)

export const obtenerBeneficiosUsados = createServerFn({ method: 'GET' }).handler(
  async () => {
    const torneo = await obtenerTorneoActual()
    if (!torneo) return { beneficios: [], cupoIa: [] }
    const [beneficios, cupoIa] = await Promise.all([
      cargarBeneficiosUsados(torneo.id),
      cargarCupoIaRestante(torneo.id),
    ])
    return { beneficios, cupoIa }
  },
)

export const obtenerEstadisticasProblemas = createServerFn({
  method: 'GET',
}).handler(async () => {
  const torneo = await obtenerTorneoActual()
  if (!torneo) {
    return { todas: [], resueltosPorTodos: [], resueltosPorNadie: [], enLlamasPorGrupo: {} }
  }
  return cargarEstadisticasProblemas(torneo.id)
})

export const obtenerActividadEnVivo = createServerFn({ method: 'GET' }).handler(
  async () => {
    const torneo = await obtenerTorneoActual()
    if (!torneo) return []
    return cargarActividadEnVivo(torneo.id)
  },
)
```

- [ ] **Step 2: Create `src/server/queries/tablero.ts`**

```ts
import { queryOptions } from '@tanstack/react-query'
import {
  obtenerActividadReciente,
  obtenerBeneficiosUsados,
  obtenerEstadisticasProblemas,
  obtenerActividadEnVivo,
} from '../functions/leaderboard'

const REFETCH_MS = 3000

export function actividadRecienteQueryOptions() {
  return queryOptions({
    queryKey: ['actividadReciente'],
    queryFn: () => obtenerActividadReciente(),
    refetchInterval: REFETCH_MS,
  })
}

export function beneficiosUsadosQueryOptions() {
  return queryOptions({
    queryKey: ['beneficiosUsados'],
    queryFn: () => obtenerBeneficiosUsados(),
    refetchInterval: REFETCH_MS,
  })
}

export function estadisticasProblemasQueryOptions() {
  return queryOptions({
    queryKey: ['estadisticasProblemas'],
    queryFn: () => obtenerEstadisticasProblemas(),
    refetchInterval: REFETCH_MS,
  })
}

export function actividadEnVivoQueryOptions() {
  return queryOptions({
    queryKey: ['actividadEnVivo'],
    queryFn: () => obtenerActividadEnVivo(),
    refetchInterval: REFETCH_MS,
  })
}
```

- [ ] **Step 3: Verify the "only server functions" test still passes and typecheck is clean**

Run: `npx vitest run tests/funciones-solo-server-fn.test.ts`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/server/functions/leaderboard.ts src/server/queries/tablero.ts
git commit -m "feat: exponer server functions publicas para el tablero de clasificacion"
```

---

### Task 6: Constante de duración + componente `CountdownTorneo`

**Files:**
- Create: `src/shared/torneo.ts`
- Create: `src/components/CountdownTorneo.tsx`
- Test: `tests/countdown-formato.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `DURACION_TORNEO_MINUTOS` from `src/shared/torneo.ts`; `formatearRestante(ms: number): string`
  and component `CountdownTorneo({ iniciadoEn: Date | null, finalizadoEn: Date | null })` from
  `CountdownTorneo.tsx`. Task 15 depends on these exact names, and on `PANEL_TITLE_TERMINAL` from
  Task 7 (create this task's component first with an inline fallback class, see Step 3 note).

- [ ] **Step 1: Write the failing test for the pure time formatter**

```ts
// tests/countdown-formato.test.ts
import { describe, it, expect } from 'vitest'
import { formatearRestante } from '../src/components/CountdownTorneo'

describe('formatearRestante', () => {
  it('formatea minutos y segundos cuando falta menos de una hora', () => {
    expect(formatearRestante(65_000)).toBe('01:05')
  })

  it('formatea horas cuando falta una hora o más', () => {
    expect(formatearRestante(2 * 3600_000 + 5 * 60_000 + 9_000)).toBe('2:05:09')
  })

  it('no baja de cero cuando el tiempo ya pasó', () => {
    expect(formatearRestante(-5000)).toBe('00:00')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/countdown-formato.test.ts`
Expected: FAIL — cannot find module `../src/components/CountdownTorneo`

- [ ] **Step 3: Implement the constant and the component**

```ts
// src/shared/torneo.ts
export const DURACION_TORNEO_MINUTOS = 180
```

```tsx
// src/components/CountdownTorneo.tsx
import { useEffect, useState } from 'react'
import { DURACION_TORNEO_MINUTOS } from '#/shared/torneo'

export function formatearRestante(ms: number): string {
  const totalSegundos = Math.max(Math.floor(ms / 1000), 0)
  const horas = Math.floor(totalSegundos / 3600)
  const minutos = Math.floor((totalSegundos % 3600) / 60)
  const segundos = totalSegundos % 60
  const mm = String(minutos).padStart(2, '0')
  const ss = String(segundos).padStart(2, '0')
  return horas > 0 ? `${horas}:${mm}:${ss}` : `${mm}:${ss}`
}

export function CountdownTorneo({
  iniciadoEn,
  finalizadoEn,
}: {
  iniciadoEn: Date | null
  finalizadoEn: Date | null
}) {
  const [ahora, setAhora] = useState(() => new Date())

  useEffect(() => {
    if (finalizadoEn || !iniciadoEn) return
    const id = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(id)
  }, [iniciadoEn, finalizadoEn])

  if (!iniciadoEn) return null

  if (finalizadoEn) {
    return (
      <span className="font-display text-[13px] font-bold tracking-[0.14em] text-[oklch(78%_0.14_152)] uppercase [font-variant-caps:small-caps]">
        Concluido
      </span>
    )
  }

  const finEsperado = iniciadoEn.getTime() + DURACION_TORNEO_MINUTOS * 60000
  const restanteMs = finEsperado - ahora.getTime()
  const urgente = restanteMs <= 15 * 60000

  return (
    <span
      className={`font-display text-[15px] font-bold tabular-nums ${
        urgente ? 'text-[oklch(78%_0.16_25)]' : 'text-[oklch(78%_0.14_152)]'
      }`}
    >
      {formatearRestante(restanteMs)}
    </span>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/countdown-formato.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/torneo.ts src/components/CountdownTorneo.tsx tests/countdown-formato.test.ts
git commit -m "feat: agregar countdown cosmetico del torneo"
```

---

### Task 7: Estilos "terminal" nuevos en `brandStyles.ts`

**Files:**
- Modify: `src/components/brandStyles.ts:221` (end of file — append after `BUTTON_TERMINAL_NAV`)

**Interfaces:**
- Produces: `CARD_TERMINAL`, `PANEL_TITLE_TERMINAL`, `PILL_FILTRO_ACTIVA`, `PILL_FILTRO_INACTIVA`.
  Tasks 8, 9, 10, 11, 12, 13 depend on these exact names.

- [ ] **Step 1: Append the new style tokens**

```ts
// Append to src/components/brandStyles.ts

/** Tarjeta oscura tipo "terminal" para los paneles del tablero público de
 * clasificación — mismo lenguaje que BUTTON_TERMINAL_RUN/ASSIST y
 * DIFICULTAD_PILL, pero como contenedor de panel en vez de botón/badge. */
export const CARD_TERMINAL =
  'rounded-md border border-[oklch(40%_0.1_150/0.5)] bg-[oklch(8%_0.02_152)] shadow-2xl shadow-black/30'

/** Título de panel dentro de CARD_TERMINAL: mismo small-caps ceremonial que
 * LOGRO_TEXT, en el verde de la familia terminal. */
export const PANEL_TITLE_TERMINAL =
  'font-display text-[13px] font-bold tracking-[0.14em] text-[oklch(78%_0.14_152)] uppercase [font-variant-caps:small-caps]'

/** Pills del filtro de categorías del tablero público — activa/inactiva,
 * mismo lenguaje visual "terminal" que el resto del módulo. */
export const PILL_FILTRO_ACTIVA =
  'cursor-pointer rounded-sm border border-[oklch(55%_0.14_152/0.6)] bg-[oklch(16%_0.03_152)] px-3 py-1.5 font-display text-[11px] font-bold tracking-wide text-[oklch(78%_0.14_152)] uppercase shadow-[0_0_12px_2px_oklch(55%_0.16_152/0.35)] transition'

export const PILL_FILTRO_INACTIVA =
  'cursor-pointer rounded-sm border border-line/40 bg-[oklch(14%_0.01_150)] px-3 py-1.5 font-display text-[11px] font-bold tracking-wide text-ink-faint uppercase opacity-60 transition hover:opacity-90'
```

- [ ] **Step 2: Verify the project still typechecks and lints**

Run: `npx tsc --noEmit`
Expected: no errors

Run: `npm run lint`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/brandStyles.ts
git commit -m "feat: agregar estilos terminal para el tablero publico de clasificacion"
```

---

### Task 8: Componente `FiltroCategorias`

**Files:**
- Create: `src/components/FiltroCategorias.tsx`

**Interfaces:**
- Consumes: `CATEGORIAS`, `Categoria` from `#/shared/dominio`; `PILL_FILTRO_ACTIVA`,
  `PILL_FILTRO_INACTIVA` from `#/components/brandStyles` (Task 7).
- Produces: `FiltroCategorias({ activas: Set<Categoria>, onToggle: (categoria: Categoria) => void })`.
  Task 15 depends on this exact name/props.

- [ ] **Step 1: Implement the component**

```tsx
// src/components/FiltroCategorias.tsx
import { CATEGORIAS } from '#/shared/dominio'
import type { Categoria } from '#/shared/dominio'
import { PILL_FILTRO_ACTIVA, PILL_FILTRO_INACTIVA } from '#/components/brandStyles'

const ETIQUETAS: Record<Categoria, string> = {
  invitado: 'Invitados',
  junior: 'Junior',
  senior: 'Senior',
}

export function FiltroCategorias({
  activas,
  onToggle,
}: {
  activas: Set<Categoria>
  onToggle: (categoria: Categoria) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIAS.map((categoria) => (
        <button
          key={categoria}
          type="button"
          onClick={() => onToggle(categoria)}
          className={activas.has(categoria) ? PILL_FILTRO_ACTIVA : PILL_FILTRO_INACTIVA}
        >
          {ETIQUETAS[categoria]}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (component isn't wired into a route yet, so no visual check here — that
happens in Task 15)

- [ ] **Step 3: Commit**

```bash
git add src/components/FiltroCategorias.tsx
git commit -m "feat: agregar componente de filtro de categorias"
```

---

### Task 9: Restilizar `LeaderboardTable` (tema terminal + brecha con el líder)

**Files:**
- Modify: `src/components/LeaderboardTable.tsx` (full rewrite)

**Interfaces:**
- Consumes: `FilaClasificacion` from `#/server/standings/calculate` (already exists, unchanged);
  `CARD_TERMINAL`, `PANEL_TITLE_TERMINAL` from Task 7.
- Produces: same component signature as before —
  `LeaderboardTable({ title, rows, usuarioActualId })` — no prop changes, only internal
  rendering/styling changes plus the new "brecha con el líder" line per row.

- [ ] **Step 1: Rewrite the component**

```tsx
// src/components/LeaderboardTable.tsx
import type { FilaClasificacion } from '#/server/standings/calculate'
import { CARD_TERMINAL, PANEL_TITLE_TERMINAL } from '#/components/brandStyles'

const GRID_COLS =
  'grid-cols-[48px_1fr_88px_72px] sm:grid-cols-[56px_1fr_100px_90px_84px]'

function claseInsignia(rank: number) {
  if (rank === 1)
    return 'bg-gradient-to-b from-brass-1 to-brass-2 text-[oklch(20%_0.02_70)] border-transparent'
  if (rank === 2)
    return 'bg-[oklch(85%_0.008_90)] text-[oklch(20%_0.01_90)] border-transparent'
  if (rank === 3)
    return 'bg-[oklch(68%_0.08_55)] text-[oklch(20%_0.02_50)] border-transparent'
  return 'bg-transparent text-[oklch(55%_0.01_150)] border-[oklch(35%_0.02_150/0.6)]'
}

function brechaConLider(row: FilaClasificacion, lider: FilaClasificacion): string | null {
  if (row.usuarioId === lider.usuarioId) return null
  const puntos = row.puntosTotales - lider.puntosTotales
  const minutos = Math.round(row.minutosPenalizacionTotal - lider.minutosPenalizacionTotal)
  const signoMinutos = minutos >= 0 ? '+' : ''
  return `${puntos} pts / ${signoMinutos}${minutos} min vs. líder`
}

export function LeaderboardTable({
  title,
  rows,
  usuarioActualId,
}: {
  title: string
  rows: Array<FilaClasificacion>
  usuarioActualId?: string
}) {
  const lider = rows[0]

  return (
    <div className={`${CARD_TERMINAL} overflow-hidden`}>
      <h2 className={`${PANEL_TITLE_TERMINAL} px-4 pt-4 text-[15px]`}>{title}</h2>
      <div
        className={`mt-3 grid ${GRID_COLS} border-y border-[oklch(30%_0.02_150/0.5)] bg-[oklch(12%_0.02_150)] px-4 py-2.5 text-[11px] font-bold tracking-wide text-[oklch(60%_0.1_85)] uppercase`}
      >
        <div>#</div>
        <div>Nombre</div>
        <div>Puntos</div>
        <div className="hidden sm:block">Resueltos</div>
        <div>Tiempo</div>
      </div>
      {rows.map((row, i) => {
        const rank = i + 1
        const esYo = row.usuarioId === usuarioActualId
        return (
          <div
            key={row.usuarioId}
            className={`grid ${GRID_COLS} items-center border-b border-[oklch(25%_0.02_150/0.5)] px-4 py-3 text-sm last:border-b-0 ${
              esYo ? 'bg-[oklch(16%_0.04_152/0.5)]' : ''
            }`}
          >
            <div>
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full border font-display text-[13px] font-bold ${claseInsignia(rank)}`}
              >
                {rank}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="flex items-center gap-2 font-medium text-[oklch(88%_0.01_150)]">
                {row.nombre}
                {esYo && (
                  <span className="rounded-sm bg-[oklch(20%_0.05_152)] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[oklch(78%_0.14_152)] uppercase">
                    Tú
                  </span>
                )}
              </span>
              {lider && (
                <span className="text-[11px] text-[oklch(55%_0.02_150)]">
                  {brechaConLider(row, lider)}
                </span>
              )}
            </div>
            <div className="font-mono font-bold text-[oklch(78%_0.16_70)]">{row.puntosTotales}</div>
            <div className="hidden font-mono text-[oklch(65%_0.01_150)] sm:block">
              {row.cantidadResueltos}
            </div>
            <div className="font-mono text-[oklch(65%_0.01_150)]">
              {Math.round(row.minutosPenalizacionTotal)} min
            </div>
          </div>
        )
      })}
      {rows.length === 0 && (
        <div className="px-4 py-6 text-center text-sm text-[oklch(55%_0.02_150)]">
          Aún no hay participantes en esta categoría.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/LeaderboardTable.tsx
git commit -m "feat: restilizar LeaderboardTable con tema terminal y brecha con el lider"
```

---

### Task 10: Componente `ActividadRecienteFeed`

**Files:**
- Create: `src/components/ActividadRecienteFeed.tsx`
- Test: `tests/actividad-reciente-tiempo-relativo.test.ts`

**Interfaces:**
- Consumes: `ActividadRecienteItem` type from `#/server/standings/actividadRecienteDatos` (Task 3);
  `Categoria` from `#/shared/dominio`; `CARD_TERMINAL`, `PANEL_TITLE_TERMINAL` from Task 7.
- Produces: `tiempoRelativo(fecha: Date, ahora: Date): string` (exported for testing) and component
  `ActividadRecienteFeed({ items, categoriasActivas })`. Task 15 depends on these exact names.

- [ ] **Step 1: Write the failing test for the pure relative-time formatter**

```ts
// tests/actividad-reciente-tiempo-relativo.test.ts
import { describe, it, expect } from 'vitest'
import { tiempoRelativo } from '../src/components/ActividadRecienteFeed'

describe('tiempoRelativo', () => {
  it('muestra segundos si pasó menos de un minuto', () => {
    const ahora = new Date('2026-07-23T15:00:30Z')
    expect(tiempoRelativo(new Date('2026-07-23T15:00:00Z'), ahora)).toBe('hace 30s')
  })

  it('muestra minutos si pasó una hora o menos', () => {
    const ahora = new Date('2026-07-23T15:10:00Z')
    expect(tiempoRelativo(new Date('2026-07-23T15:00:00Z'), ahora)).toBe('hace 10m')
  })

  it('muestra horas si pasó más de una hora', () => {
    const ahora = new Date('2026-07-23T17:05:00Z')
    expect(tiempoRelativo(new Date('2026-07-23T15:00:00Z'), ahora)).toBe('hace 2h')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/actividad-reciente-tiempo-relativo.test.ts`
Expected: FAIL — cannot find module `../src/components/ActividadRecienteFeed`

- [ ] **Step 3: Implement the component**

```tsx
// src/components/ActividadRecienteFeed.tsx
import type { ActividadRecienteItem } from '#/server/standings/actividadRecienteDatos'
import type { Categoria } from '#/shared/dominio'
import { CARD_TERMINAL, PANEL_TITLE_TERMINAL } from '#/components/brandStyles'

export function tiempoRelativo(fecha: Date, ahora: Date): string {
  const segundos = Math.max(Math.floor((ahora.getTime() - fecha.getTime()) / 1000), 0)
  if (segundos < 60) return `hace ${segundos}s`
  const minutos = Math.floor(segundos / 60)
  if (minutos < 60) return `hace ${minutos}m`
  const horas = Math.floor(minutos / 60)
  return `hace ${horas}h`
}

export function ActividadRecienteFeed({
  items,
  categoriasActivas,
}: {
  items: ActividadRecienteItem[]
  categoriasActivas: Set<Categoria>
}) {
  const ahora = new Date()
  const filtrados = items.filter((i) => categoriasActivas.has(i.usuarioCategoria))

  return (
    <div className={`${CARD_TERMINAL} p-4`}>
      <h3 className={PANEL_TITLE_TERMINAL}>Actividad reciente</h3>
      <ul className="mt-3 flex flex-col gap-2 text-[13px] text-ink-soft">
        {filtrados.map((item, i) => (
          <li key={`${item.usuarioId}-${i}`}>
            <span className="font-semibold text-ink">{item.usuarioNombre}</span> resolvió{' '}
            <span className="text-[oklch(78%_0.14_152)]">{item.problemaTitulo}</span>{' '}
            <span className="text-ink-faint">
              ({tiempoRelativo(new Date(item.creadoEn), ahora)})
            </span>
          </li>
        ))}
        {filtrados.length === 0 && <li className="text-ink-faint">Todavía no hay actividad.</li>}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/actividad-reciente-tiempo-relativo.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ActividadRecienteFeed.tsx tests/actividad-reciente-tiempo-relativo.test.ts
git commit -m "feat: agregar feed de actividad reciente"
```

---

### Task 11: Componentes `BeneficiosUsadosPanel` e `IaRestantePanel`

**Files:**
- Create: `src/components/BeneficiosUsadosPanel.tsx`
- Create: `src/components/IaRestantePanel.tsx`

**Interfaces:**
- Consumes: `BeneficioUsadoItem`, `CupoIaItem` types from `#/server/standings/beneficiosUsadosDatos`
  (Task 4); `CATALOGO_BENEFICIOS` from `#/shared/beneficios` (already exists); `Categoria` from
  `#/shared/dominio`; `CARD_TERMINAL`, `PANEL_TITLE_TERMINAL` from Task 7.
- Produces: `BeneficiosUsadosPanel({ items, categoriasActivas })` and `IaRestantePanel({ items })`.
  Task 15 depends on these exact names.

- [ ] **Step 1: Implement `BeneficiosUsadosPanel`**

```tsx
// src/components/BeneficiosUsadosPanel.tsx
import type { BeneficioUsadoItem } from '#/server/standings/beneficiosUsadosDatos'
import type { Categoria } from '#/shared/dominio'
import { CATALOGO_BENEFICIOS } from '#/shared/beneficios'
import { CARD_TERMINAL, PANEL_TITLE_TERMINAL } from '#/components/brandStyles'

export function BeneficiosUsadosPanel({
  items,
  categoriasActivas,
}: {
  items: BeneficioUsadoItem[]
  categoriasActivas: Set<Categoria>
}) {
  const filtrados = items.filter((i) => categoriasActivas.has(i.usuarioCategoria))

  return (
    <div className={`${CARD_TERMINAL} p-4`}>
      <h3 className={PANEL_TITLE_TERMINAL}>Ventajas / desventajas</h3>
      <ul className="mt-3 flex flex-col gap-2 text-[13px] text-ink-soft">
        {filtrados.map((item) => {
          const definicion = CATALOGO_BENEFICIOS[item.clave]
          const objetivo = item.objetivoUsuarioNombre ?? item.objetivoIngeniero
          return (
            <li key={item.usuarioId}>
              <span className="font-semibold text-ink">{item.usuarioNombre}</span> — {definicion.texto}
              {item.usadoEn ? (
                <span className="text-[oklch(78%_0.14_152)]">
                  {' '}
                  · usada{objetivo ? ` contra ${objetivo}` : ''}
                </span>
              ) : (
                <span className="text-ink-faint"> · sin usar</span>
              )}
            </li>
          )
        })}
        {filtrados.length === 0 && (
          <li className="text-ink-faint">Nadie tiene beneficio asignado todavía.</li>
        )}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Implement `IaRestantePanel`**

```tsx
// src/components/IaRestantePanel.tsx
import type { CupoIaItem } from '#/server/standings/beneficiosUsadosDatos'
import { CARD_TERMINAL, PANEL_TITLE_TERMINAL } from '#/components/brandStyles'

export function IaRestantePanel({ items }: { items: CupoIaItem[] }) {
  return (
    <div className={`${CARD_TERMINAL} p-4`}>
      <h3 className={PANEL_TITLE_TERMINAL}>Preguntas de IA restantes</h3>
      <ul className="mt-3 flex flex-col gap-1.5 text-[13px] text-ink-soft">
        {items.map((item) => (
          <li key={item.usuarioId} className="flex items-center justify-between gap-3">
            <span className="text-ink">{item.usuarioNombre}</span>
            <span className="font-mono font-bold text-[oklch(78%_0.14_152)]">
              {item.preguntasRestantes}
            </span>
          </li>
        ))}
        {items.length === 0 && <li className="text-ink-faint">No hay participantes invitados.</li>}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/BeneficiosUsadosPanel.tsx src/components/IaRestantePanel.tsx
git commit -m "feat: agregar paneles de beneficios usados y cupo de IA"
```

---

### Task 12: Componentes `EstadisticasProblemasPanel` y `ProblemaEnLlamasPanel`

**Files:**
- Create: `src/components/EstadisticasProblemasPanel.tsx`
- Create: `src/components/ProblemaEnLlamasPanel.tsx`

**Interfaces:**
- Consumes: `EstadisticaProblema` type from `#/server/standings/estadisticasProblemas` (Task 1);
  `Grupo` from `#/shared/dominio`; `CARD_TERMINAL`, `PANEL_TITLE_TERMINAL` from Task 7.
- Produces: `EstadisticasProblemasPanel({ resueltosPorTodos, resueltosPorNadie, grupoVisible })` and
  `ProblemaEnLlamasPanel({ porGrupo, grupoVisible })`, where
  `grupoVisible: (grupo: Grupo) => boolean`. Task 15 depends on these exact names.

- [ ] **Step 1: Implement `EstadisticasProblemasPanel`**

```tsx
// src/components/EstadisticasProblemasPanel.tsx
import type { EstadisticaProblema } from '#/server/standings/estadisticasProblemas'
import type { Grupo } from '#/shared/dominio'
import { CARD_TERMINAL, PANEL_TITLE_TERMINAL } from '#/components/brandStyles'

const LIMITE = 5

export function EstadisticasProblemasPanel({
  resueltosPorTodos,
  resueltosPorNadie,
  grupoVisible,
}: {
  resueltosPorTodos: EstadisticaProblema[]
  resueltosPorNadie: EstadisticaProblema[]
  grupoVisible: (grupo: Grupo) => boolean
}) {
  const todos = resueltosPorTodos.filter((p) => grupoVisible(p.grupo))
  const nadie = resueltosPorNadie.filter((p) => grupoVisible(p.grupo))

  return (
    <div className={`${CARD_TERMINAL} p-4`}>
      <h3 className={PANEL_TITLE_TERMINAL}>Resueltos por todos / por nadie</h3>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[oklch(78%_0.14_152)] uppercase">
            Por todos
          </p>
          <ul className="mt-1.5 flex flex-col gap-1 text-[13px] text-ink-soft">
            {todos.slice(0, LIMITE).map((p) => (
              <li key={p.problemaId}>{p.titulo}</li>
            ))}
            {todos.length === 0 && <li className="text-ink-faint">Ninguno todavía.</li>}
            {todos.length > LIMITE && (
              <li className="text-ink-faint">+{todos.length - LIMITE} más</li>
            )}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[oklch(78%_0.16_25)] uppercase">
            Por nadie
          </p>
          <ul className="mt-1.5 flex flex-col gap-1 text-[13px] text-ink-soft">
            {nadie.slice(0, LIMITE).map((p) => (
              <li key={p.problemaId}>{p.titulo}</li>
            ))}
            {nadie.length === 0 && <li className="text-ink-faint">Ninguno.</li>}
            {nadie.length > LIMITE && (
              <li className="text-ink-faint">+{nadie.length - LIMITE} más</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement `ProblemaEnLlamasPanel`**

```tsx
// src/components/ProblemaEnLlamasPanel.tsx
import type { EstadisticaProblema } from '#/server/standings/estadisticasProblemas'
import type { Grupo } from '#/shared/dominio'
import { CARD_TERMINAL, PANEL_TITLE_TERMINAL } from '#/components/brandStyles'

const ETIQUETA_GRUPO: Record<Grupo, string> = {
  invitado_junior: 'Invitado / Junior',
  senior: 'Senior',
}

export function ProblemaEnLlamasPanel({
  porGrupo,
  grupoVisible,
}: {
  porGrupo: Partial<Record<Grupo, EstadisticaProblema>>
  grupoVisible: (grupo: Grupo) => boolean
}) {
  const entradas = (Object.entries(porGrupo) as [Grupo, EstadisticaProblema][]).filter(([grupo]) =>
    grupoVisible(grupo),
  )

  return (
    <div className={`${CARD_TERMINAL} p-4`}>
      <h3 className={PANEL_TITLE_TERMINAL}>Problema en llamas</h3>
      <ul className="mt-3 flex flex-col gap-2 text-[13px] text-ink-soft">
        {entradas.map(([grupo, p]) => (
          <li key={grupo}>
            <span className="text-[11px] font-bold text-ink-faint uppercase">
              {ETIQUETA_GRUPO[grupo]}
            </span>
            <br />
            <span className="text-ink">{p.titulo}</span> — {p.intentosTotales} intentos,{' '}
            {Math.round(p.tasaAciertos * 100)}% de aciertos
          </li>
        ))}
        {entradas.length === 0 && (
          <li className="text-ink-faint">Todavía no hay suficiente actividad.</li>
        )}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/EstadisticasProblemasPanel.tsx src/components/ProblemaEnLlamasPanel.tsx
git commit -m "feat: agregar paneles de resueltos por todos-nadie y problema en llamas"
```

---

### Task 13: Componente `ActividadEnVivoPanel`

**Files:**
- Create: `src/components/ActividadEnVivoPanel.tsx`

**Interfaces:**
- Consumes: `ActividadEnVivo` type from `#/server/standings/actividadEnVivo` (Task 2); `Categoria`
  from `#/shared/dominio`; `CARD_TERMINAL`, `PANEL_TITLE_TERMINAL` from Task 7.
- Produces: `ActividadEnVivoPanel({ items, categoriasActivas })`. Task 15 depends on this exact name.

- [ ] **Step 1: Implement the component**

```tsx
// src/components/ActividadEnVivoPanel.tsx
import type { ActividadEnVivo } from '#/server/standings/actividadEnVivo'
import type { Categoria } from '#/shared/dominio'
import { CARD_TERMINAL, PANEL_TITLE_TERMINAL } from '#/components/brandStyles'

export function ActividadEnVivoPanel({
  items,
  categoriasActivas,
}: {
  items: ActividadEnVivo[]
  categoriasActivas: Set<Categoria>
}) {
  const filtrados = items.filter((i) => categoriasActivas.has(i.usuarioCategoria))

  return (
    <div className={`${CARD_TERMINAL} p-4`}>
      <h3 className={PANEL_TITLE_TERMINAL}>Quién resuelve qué</h3>
      <ul className="mt-3 flex flex-col gap-1.5 text-[13px] text-ink-soft">
        {filtrados.map((item) => (
          <li key={item.usuarioId} className="flex items-center justify-between gap-3">
            <span className="text-ink">{item.usuarioNombre}</span>
            <span className="text-[oklch(78%_0.14_152)]">{item.problemaTitulo}</span>
          </li>
        ))}
        {filtrados.length === 0 && (
          <li className="text-ink-faint">Nadie con actividad en los últimos 10 minutos.</li>
        )}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ActividadEnVivoPanel.tsx
git commit -m "feat: agregar panel de quien resuelve que"
```

---

### Task 14: Mover la ruta a pública + ajustar el link de navegación

**Files:**
- Create: `src/routes/clasificacion.tsx` (moved content, baseline only — full dashboard comes in Task 15)
- Delete: `src/routes/_app/clasificacion.tsx`
- Modify: `src/components/NavbarParticipante.tsx:45-56`

**Interfaces:**
- Consumes: `clasificacionQueryOptions`, `usuarioActualOpcionalQueryOptions`, `LeaderboardTable`,
  `GRADIENT_TEXT`, `BrandDivider` (all already exist, unchanged).
- Produces: nothing new — this task only relocates the route and confirms it renders without a
  session. Task 15 rewrites this same file to add all the new panels.

- [ ] **Step 1: Create the new route file with the existing content (unchanged behavior)**

```tsx
// src/routes/clasificacion.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { clasificacionQueryOptions } from '#/server/queries/clasificacion'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'
import { LeaderboardTable } from '#/components/LeaderboardTable'
import { GRADIENT_TEXT } from '#/components/brandStyles'
import { BrandDivider } from '#/components/BrandDivider'

export const Route = createFileRoute('/clasificacion')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(clasificacionQueryOptions()),
      context.queryClient.ensureQueryData(usuarioActualOpcionalQueryOptions()),
    ]),
  component: LeaderboardPage,
})

function LeaderboardPage() {
  const { data } = useSuspenseQuery(clasificacionQueryOptions())
  const { data: usuario } = useSuspenseQuery(usuarioActualOpcionalQueryOptions())

  if (!data.iniciado)
    return <p className="p-8 text-ink-soft">El torneo aún no ha comenzado.</p>

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-8">
      <h1 className={`font-display text-2xl font-bold tracking-wide uppercase ${GRADIENT_TEXT}`}>
        Tabla de Clasificación
      </h1>
      <div className="mt-2 mb-6 flex items-center gap-3">
        <BrandDivider />
        <p className="text-sm text-ink-soft italic">Puntos acumulados por problemas resueltos</p>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <LeaderboardTable title="Invitados" rows={data.invitado} usuarioActualId={usuario?.id} />
        <LeaderboardTable title="Junior" rows={data.junior} usuarioActualId={usuario?.id} />
        <LeaderboardTable title="Senior" rows={data.senior} usuarioActualId={usuario?.id} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Delete the old route file**

```bash
git rm src/routes/_app/clasificacion.tsx
```

- [ ] **Step 3: Update `NavbarParticipante` so the "Clasificación" link no longer requires check-in**

Current (`src/components/NavbarParticipante.tsx:45-56`):

```tsx
          {usuario.ingresadoEn && (
            <>
              <Link to="/problemas" className={problemas.className}>
                Problemas
                {problemas.activo && <span className={NAV_LINK_CARET} />}
              </Link>
              <Link to="/clasificacion" className={clasificacion.className}>
                Clasificación
                {clasificacion.activo && <span className={NAV_LINK_CARET} />}
              </Link>
            </>
          )}
```

New:

```tsx
          {usuario.ingresadoEn && (
            <Link to="/problemas" className={problemas.className}>
              Problemas
              {problemas.activo && <span className={NAV_LINK_CARET} />}
            </Link>
          )}
          <Link to="/clasificacion" className={clasificacion.className}>
            Clasificación
            {clasificacion.activo && <span className={NAV_LINK_CARET} />}
          </Link>
```

- [ ] **Step 4: Regenerate the route tree and verify the build**

Run: `npm run generate-routes`
Expected: `src/routeTree.gen.ts` regenerates with `/clasificacion` as a top-level route (no longer
nested under `/_app`)

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Manually verify the route is public**

Start the dev server (`npm run dev`), open `/clasificacion` in a private/incognito browser window
(no session cookie). Expected: the page loads and shows the leaderboard tables (or the "El torneo
aún no ha comenzado" message) instead of redirecting to `/`.

- [ ] **Step 6: Commit**

```bash
git add src/routes/clasificacion.tsx src/components/NavbarParticipante.tsx
git commit -m "feat: mover /clasificacion fuera de _app para que sea publica"
```

---

### Task 15: Ensamblar el tablero completo en `/clasificacion`

**Files:**
- Modify: `src/routes/clasificacion.tsx` (full rewrite)

**Interfaces:**
- Consumes: everything produced by Tasks 1–14: query options from `queries/tablero.ts` and
  `queries/torneo.ts` (existing `estadoTorneoQueryOptions`), all panel components, `FiltroCategorias`,
  `CountdownTorneo`, restyled `LeaderboardTable`, `grupoDeCategoria` from
  `#/server/problems/grupo` (existing), `CATEGORIAS`/`Categoria`/`Grupo` from `#/shared/dominio`.
- Produces: the final page component — no new exports consumed by later tasks.

- [ ] **Step 1: Rewrite `src/routes/clasificacion.tsx`**

```tsx
// src/routes/clasificacion.tsx
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { clasificacionQueryOptions } from '#/server/queries/clasificacion'
import { usuarioActualOpcionalQueryOptions } from '#/server/queries/usuarioActual'
import { estadoTorneoQueryOptions } from '#/server/queries/torneo'
import {
  actividadRecienteQueryOptions,
  beneficiosUsadosQueryOptions,
  estadisticasProblemasQueryOptions,
  actividadEnVivoQueryOptions,
} from '#/server/queries/tablero'
import { LeaderboardTable } from '#/components/LeaderboardTable'
import { FiltroCategorias } from '#/components/FiltroCategorias'
import { CountdownTorneo } from '#/components/CountdownTorneo'
import { ActividadRecienteFeed } from '#/components/ActividadRecienteFeed'
import { BeneficiosUsadosPanel } from '#/components/BeneficiosUsadosPanel'
import { IaRestantePanel } from '#/components/IaRestantePanel'
import { EstadisticasProblemasPanel } from '#/components/EstadisticasProblemasPanel'
import { ProblemaEnLlamasPanel } from '#/components/ProblemaEnLlamasPanel'
import { ActividadEnVivoPanel } from '#/components/ActividadEnVivoPanel'
import { grupoDeCategoria } from '#/server/problems/grupo'
import { CATEGORIAS } from '#/shared/dominio'
import type { Categoria, Grupo } from '#/shared/dominio'
import { GRADIENT_TEXT } from '#/components/brandStyles'
import { BrandDivider } from '#/components/BrandDivider'

export const Route = createFileRoute('/clasificacion')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(clasificacionQueryOptions()),
      context.queryClient.ensureQueryData(usuarioActualOpcionalQueryOptions()),
      context.queryClient.ensureQueryData(estadoTorneoQueryOptions()),
      context.queryClient.ensureQueryData(actividadRecienteQueryOptions()),
      context.queryClient.ensureQueryData(beneficiosUsadosQueryOptions()),
      context.queryClient.ensureQueryData(estadisticasProblemasQueryOptions()),
      context.queryClient.ensureQueryData(actividadEnVivoQueryOptions()),
    ]),
  component: LeaderboardPage,
})

const GRID_COLS_POR_CANTIDAD: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 lg:grid-cols-2',
  3: 'grid-cols-1 lg:grid-cols-3',
}

const TABLAS_CATEGORIA: { categoria: Categoria; titulo: string }[] = [
  { categoria: 'invitado', titulo: 'Invitados' },
  { categoria: 'junior', titulo: 'Junior' },
  { categoria: 'senior', titulo: 'Senior' },
]

function LeaderboardPage() {
  const [categoriasActivas, setCategoriasActivas] = useState<Set<Categoria>>(
    () => new Set(CATEGORIAS),
  )

  const { data } = useSuspenseQuery(clasificacionQueryOptions())
  const { data: usuario } = useSuspenseQuery(usuarioActualOpcionalQueryOptions())
  const { data: estado } = useSuspenseQuery(estadoTorneoQueryOptions())
  const { data: actividadReciente } = useSuspenseQuery(actividadRecienteQueryOptions())
  const { data: beneficiosYCupoIa } = useSuspenseQuery(beneficiosUsadosQueryOptions())
  const { data: estadisticasProblemas } = useSuspenseQuery(estadisticasProblemasQueryOptions())
  const { data: actividadEnVivo } = useSuspenseQuery(actividadEnVivoQueryOptions())

  function alternarCategoria(categoria: Categoria) {
    setCategoriasActivas((previo) => {
      const siguiente = new Set(previo)
      if (siguiente.has(categoria)) {
        if (siguiente.size === 1) return previo
        siguiente.delete(categoria)
      } else {
        siguiente.add(categoria)
      }
      return siguiente
    })
  }

  function grupoVisible(grupo: Grupo) {
    return CATEGORIAS.some(
      (categoria) => categoriasActivas.has(categoria) && grupoDeCategoria(categoria) === grupo,
    )
  }

  if (!data.iniciado)
    return <p className="p-8 text-ink-soft">El torneo aún no ha comenzado.</p>

  const tablasVisibles = TABLAS_CATEGORIA.filter((t) => categoriasActivas.has(t.categoria))

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-8">
      <h1 className={`font-display text-2xl font-bold tracking-wide uppercase ${GRADIENT_TEXT}`}>
        Tabla de Clasificación
      </h1>
      <div className="mt-2 mb-6 flex items-center gap-3">
        <BrandDivider />
        <p className="text-sm text-ink-soft italic">Puntos acumulados por problemas resueltos</p>
      </div>

      <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <FiltroCategorias activas={categoriasActivas} onToggle={alternarCategoria} />
        <CountdownTorneo
          iniciadoEn={estado?.iniciadoEn ? new Date(estado.iniciadoEn) : null}
          finalizadoEn={estado?.finalizadoEn ? new Date(estado.finalizadoEn) : null}
        />
      </div>

      <div
        className={`grid ${GRID_COLS_POR_CANTIDAD[tablasVisibles.length] ?? 'grid-cols-1'} gap-8`}
      >
        {tablasVisibles.map((t) => (
          <LeaderboardTable
            key={t.categoria}
            title={t.titulo}
            rows={data[t.categoria]}
            usuarioActualId={usuario?.id}
          />
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <ActividadRecienteFeed items={actividadReciente} categoriasActivas={categoriasActivas} />
        <BeneficiosUsadosPanel
          items={beneficiosYCupoIa.beneficios}
          categoriasActivas={categoriasActivas}
        />
        {categoriasActivas.has('invitado') && (
          <IaRestantePanel items={beneficiosYCupoIa.cupoIa} />
        )}
        <EstadisticasProblemasPanel
          resueltosPorTodos={estadisticasProblemas.resueltosPorTodos}
          resueltosPorNadie={estadisticasProblemas.resueltosPorNadie}
          grupoVisible={grupoVisible}
        />
        <ProblemaEnLlamasPanel
          porGrupo={estadisticasProblemas.enLlamasPorGrupo}
          grupoVisible={grupoVisible}
        />
        <ActividadEnVivoPanel items={actividadEnVivo} categoriasActivas={categoriasActivas} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Regenerate routes and verify the full build**

Run: `npm run generate-routes`
Expected: no errors

Run: `npx tsc --noEmit`
Expected: no errors

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/routes/clasificacion.tsx
git commit -m "feat: ensamblar tablero completo de clasificacion publico"
```

---

### Task 16: Verificación manual final

**Files:** none (no code changes)

- [ ] **Step 1: Run the full automated test suite**

Run: `npm run test`
Expected: all tests pass, including every test added in Tasks 1–10

- [ ] **Step 2: Run lint and format check**

Run: `npm run lint`
Expected: no errors

Run: `npm run check`
Expected: no errors (if it fails only on files this plan touched, run `npx prettier --write <esos archivos>` and re-check — do not run `prettier --write .`/`npm run format` repo-wide, it rewrites line endings across the whole tree)

- [ ] **Step 3: Manual walkthrough with a running tournament**

With `npm run dev` running and a tournament already started (`iniciadoEn` set) with at least one
participant per category, some `envios`, some `corridas`, and a `beneficios` row assigned:

1. Open `/clasificacion` in a private/incognito window (no session) — confirm it loads and shows
   real data, not a redirect to `/`.
2. Toggle each category pill off/on — confirm the corresponding leaderboard table and the
   category-scoped panels (actividad reciente, beneficios, quién-resuelve-qué) update, and that
   you cannot uncheck the last remaining pill.
3. Confirm the countdown shows a live mm:ss/h:mm:ss and turns red inside the last 15 minutes
   (temporarily edit `DURACION_TORNEO_MINUTOS` locally to a small number to test this, then revert).
4. Confirm "resuelto por todos/por nadie" and "problema en llamas" reflect the seeded data.
5. Confirm "quién resuelve qué" shows a participant after they Run code, and that it disappears
   ~10 minutes later (or seed a stale `corridas` row directly to check the exclusion).
6. Confirm IA restante only appears/lists `invitado` participants, and only when the "Invitados"
   pill is active.

- [ ] **Step 4: Update the CLAUDE.md leaderboard reference if needed**

Check whether `CLAUDE.md`'s "Tournament lifecycle & scoring" section still accurately describes
`/clasificacion` as covered by route guards. If it references the old auth-gated behavior,
update it to note the route is public. (No other CLAUDE.md sections describe this page today, so
this is likely a no-op — confirm with `grep -n "clasificacion" CLAUDE.md`.)

This step has no automated test — it's a documentation accuracy check.
