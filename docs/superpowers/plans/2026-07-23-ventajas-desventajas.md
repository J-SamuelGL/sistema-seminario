# Ventajas y desventajas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al iniciar un torneo, asignar automáticamente a cada participante una "ventaja" (invitado/junior)
o "desventaja" (senior) al azar, y permitir que el admin registre desde `/admin/participantes` cuándo y
contra quién se aplicó/usó.

**Architecture:** Catálogo estático de 13 ítems en `src/shared/beneficios.ts` (sin tabla en BD). Una tabla
nueva `beneficios` (una fila por participante) guarda la clave asignada y, cuando se registra el uso, la
marca de tiempo y el objetivo (otro participante o un ingeniero, según el ítem). La asignación se dispara
dentro de `iniciarTorneo`; el registro de uso es una acción de admin.

**Tech Stack:** TanStack Start (`createServerFn`), Drizzle ORM / MySQL, Zod, React + TanStack Query,
Vitest (tests contra MySQL real, sin mocks de BD).

## Global Constraints

- Todo identificador, texto de UI, nombre de tabla/columna y mensaje de error va en español (convención
  del proyecto — ver `CLAUDE.md`).
- `src/server/functions/*.ts` solo puede exportar valores `createServerFn` (enforced por
  `tests/funciones-solo-server-fn.test.ts`); toda lógica con cuerpo real va en un módulo de servidor plano
  (`src/server/beneficios/*.ts`) importado desde ahí.
- Los cambios de esquema se aplican con `npx drizzle-kit push` (no hay migraciones versionadas en el
  repo) — requiere `DATABASE_URL` apuntando a una MySQL corriendo.
- Los tests que tocan BD usan la conexión real (`src/server/db/client.ts`), no mocks — mismo patrón que
  `tests/crear-participante.test.ts` / `tests/tournament-functions.test.ts`.
- No se prueba UI vía browser automation — el usuario la valida manualmente.
- No agregar tabla ni pantalla CRUD para "ingenieros": es un array hardcodeado
  (`INGENIEROS` en `src/shared/beneficios.ts`) con nombres placeholder, a reemplazar en código antes del
  torneo.

---

### Task 1: Catálogo compartido de beneficios

**Files:**
- Create: `src/shared/beneficios.ts`
- Test: `tests/beneficios-catalogo.test.ts`

**Interfaces:**
- Produces: `CLAVES_VENTAJA: readonly string[]` (7 claves), `CLAVES_DESVENTAJA: readonly string[]` (6
  claves), `CLAVES_BENEFICIO: readonly string[]` (unión de ambas, 13), `type ClaveBeneficio`, `type
  TipoObjetivo = 'ninguno' | 'participante' | 'ingeniero'`, `CATALOGO_BENEFICIOS: Record<ClaveBeneficio,
  { texto: string; pool: 'ventaja' | 'desventaja'; tipoObjetivo: TipoObjetivo }>`, `INGENIEROS: readonly
  string[]`, `type Ingeniero`.

- [ ] **Step 1: Escribir el archivo del catálogo**

```typescript
// src/shared/beneficios.ts
// Catálogo de "ventajas" (invitado/junior) y "desventajas" (senior) del
// torneo. La aplicación real ocurre fuera del sistema; esto solo define qué
// se puede asignar y qué tipo de objetivo pide cada ítem al registrarlo.
// Ver docs/superpowers/specs/2026-07-23-ventajas-desventajas-design.md.

export const CLAVES_VENTAJA = [
  'busqueda_google',
  'ver_codigo',
  'borrar_codigo',
  'consultar_ingeniero',
  'nada',
  'cupon_premio',
  'prompt_ia',
] as const

export const CLAVES_DESVENTAJA = [
  'salir_caminar',
  'reiniciar_compu',
  'poner_cancion',
  'voltear_pantalla',
  'atar_mano',
  'letra_chiquita',
] as const

export const CLAVES_BENEFICIO = [
  ...CLAVES_VENTAJA,
  ...CLAVES_DESVENTAJA,
] as const
export type ClaveBeneficio = (typeof CLAVES_BENEFICIO)[number]

export const TIPOS_OBJETIVO = ['ninguno', 'participante', 'ingeniero'] as const
export type TipoObjetivo = (typeof TIPOS_OBJETIVO)[number]

export const CATALOGO_BENEFICIOS: Record<
  ClaveBeneficio,
  { texto: string; pool: 'ventaja' | 'desventaja'; tipoObjetivo: TipoObjetivo }
> = {
  busqueda_google: {
    texto: 'Una búsqueda en Google',
    pool: 'ventaja',
    tipoObjetivo: 'ninguno',
  },
  ver_codigo: {
    texto: 'Ver el código de alguien más a su elección (solo un minuto)',
    pool: 'ventaja',
    tipoObjetivo: 'participante',
  },
  borrar_codigo: {
    texto:
      'Borrar una porción del código de alguien más (una línea máximo o modificar una palabra máximo)',
    pool: 'ventaja',
    tipoObjetivo: 'participante',
  },
  consultar_ingeniero: {
    texto: 'Consultar a un ingeniero (minuto y medio)',
    pool: 'ventaja',
    tipoObjetivo: 'ingeniero',
  },
  nada: {
    texto: 'Nada',
    pool: 'ventaja',
    tipoObjetivo: 'ninguno',
  },
  cupon_premio: {
    texto: 'Cupón o premio inmediato',
    pool: 'ventaja',
    tipoObjetivo: 'ninguno',
  },
  prompt_ia: {
    texto: 'Un prompt a una IA (solo un minuto para escribirlo y leerlo)',
    pool: 'ventaja',
    tipoObjetivo: 'ninguno',
  },
  salir_caminar: {
    texto: 'Salir a dar una vuelta',
    pool: 'desventaja',
    tipoObjetivo: 'participante',
  },
  reiniciar_compu: {
    texto: 'Reiniciar la compu de alguien más',
    pool: 'desventaja',
    tipoObjetivo: 'participante',
  },
  poner_cancion: {
    texto: 'Ponerle una canción a alguien (máximo 5 minutos de largo)',
    pool: 'desventaja',
    tipoObjetivo: 'participante',
  },
  voltear_pantalla: {
    texto: 'Voltearle la pantalla a alguien más (5 minutos)',
    pool: 'desventaja',
    tipoObjetivo: 'participante',
  },
  atar_mano: {
    texto: 'Atarle la mano dominante a alguien (5 minutos)',
    pool: 'desventaja',
    tipoObjetivo: 'participante',
  },
  letra_chiquita: {
    texto: 'Hacer chiquita la letra del IDE de alguien (5 minutos)',
    pool: 'desventaja',
    tipoObjetivo: 'participante',
  },
}

// Placeholder intencional — reemplazar con los nombres reales antes del
// torneo. No hay tabla ni pantalla de administración para esto (decisión
// explícita del spec): es un array que se edita en código.
export const INGENIEROS = ['Ingeniero 1', 'Ingeniero 2'] as const
export type Ingeniero = (typeof INGENIEROS)[number]
```

- [ ] **Step 2: Escribir el test del catálogo**

```typescript
// tests/beneficios-catalogo.test.ts
import { describe, it, expect } from 'vitest'
import {
  CLAVES_VENTAJA,
  CLAVES_DESVENTAJA,
  CLAVES_BENEFICIO,
  CATALOGO_BENEFICIOS,
} from '../src/shared/beneficios'

describe('CATALOGO_BENEFICIOS', () => {
  it('tiene 7 ventajas y 6 desventajas, sin claves repetidas', () => {
    expect(CLAVES_VENTAJA.length).toBe(7)
    expect(CLAVES_DESVENTAJA.length).toBe(6)
    expect(new Set(CLAVES_BENEFICIO).size).toBe(13)
  })

  it('define una entrada de catálogo con texto para cada clave', () => {
    for (const clave of CLAVES_BENEFICIO) {
      expect(CATALOGO_BENEFICIOS[clave]).toBeDefined()
      expect(CATALOGO_BENEFICIOS[clave].texto.length).toBeGreaterThan(0)
    }
  })

  it('todas las desventajas piden objetivo de tipo participante', () => {
    for (const clave of CLAVES_DESVENTAJA) {
      expect(CATALOGO_BENEFICIOS[clave].tipoObjetivo).toBe('participante')
    }
  })

  it('solo consultar_ingeniero pide objetivo de tipo ingeniero', () => {
    const conIngeniero = CLAVES_BENEFICIO.filter(
      (c) => CATALOGO_BENEFICIOS[c].tipoObjetivo === 'ingeniero',
    )
    expect(conIngeniero).toEqual(['consultar_ingeniero'])
  })
})
```

- [ ] **Step 3: Correr el test**

Run: `npx vitest run tests/beneficios-catalogo.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/shared/beneficios.ts tests/beneficios-catalogo.test.ts
git commit -m "feat: catalogo de ventajas/desventajas del torneo"
```

---

### Task 2: Esquema de base de datos y asignación aleatoria

**Files:**
- Modify: `src/server/db/schema.ts`
- Create: `src/server/beneficios/asignar.ts`
- Test: `tests/beneficios-asignar.test.ts`

**Interfaces:**
- Consumes: `CLAVES_VENTAJA`, `CLAVES_DESVENTAJA`, `CLAVES_BENEFICIO`, `ClaveBeneficio`, `INGENIEROS` de
  `src/shared/beneficios` (Task 1).
- Produces: tabla `beneficios` (`typeof beneficios.$inferSelect` con campos `id`, `usuarioId`, `clave`,
  `asignadoEn`, `usadoEn`, `objetivoUsuarioId`, `objetivoIngeniero`); función
  `asignarBeneficios(torneoId: string): Promise<void>` desde `src/server/beneficios/asignar.ts`.

- [ ] **Step 1: Agregar la tabla `beneficios` al esquema**

En `src/server/db/schema.ts`, agregar el import y la tabla al final del archivo:

```typescript
// agregar en el bloque de imports existente, junto a los otros imports de '../../shared/dominio':
import { CLAVES_BENEFICIO, INGENIEROS } from '../../shared/beneficios'
```

```typescript
// agregar al final del archivo, después de `corridas`:
export const beneficios = mysqlTable('beneficios', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  usuarioId: varchar('usuario_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  clave: mysqlEnum('clave', CLAVES_BENEFICIO).notNull(),
  asignadoEn: timestamp('asignado_en').notNull().defaultNow(),
  usadoEn: timestamp('usado_en'),
  objetivoUsuarioId: varchar('objetivo_usuario_id', { length: 36 }).references(
    () => usuarios.id,
    { onDelete: 'set null' },
  ),
  objetivoIngeniero: mysqlEnum('objetivo_ingeniero', INGENIEROS),
})
```

- [ ] **Step 2: Aplicar el esquema a la base de datos de desarrollo**

Run: `npx drizzle-kit push`
Expected: prompt/resumen mostrando la tabla nueva `beneficios` a crear; confirmar. Termina sin error.

- [ ] **Step 3: Escribir la lógica de asignación aleatoria**

```typescript
// src/server/beneficios/asignar.ts
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios, beneficios } from '../db/schema'
import { CLAVES_VENTAJA, CLAVES_DESVENTAJA } from '../../shared/beneficios'
import type { ClaveBeneficio } from '../../shared/beneficios'

function elegirAleatorio<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)]
}

/**
 * Asigna una ventaja (invitado/junior) o desventaja (senior) al azar a cada
 * participante del torneo que todavía no tenga una. Pensada para llamarse
 * una sola vez, desde `iniciarTorneo` — el filtro por "sin beneficio
 * todavía" la vuelve segura de llamar más de una vez sin duplicar filas.
 */
export async function asignarBeneficios(torneoId: string): Promise<void> {
  const sinBeneficio = await db
    .select({ id: usuarios.id, categoria: usuarios.categoria })
    .from(usuarios)
    .leftJoin(beneficios, eq(beneficios.usuarioId, usuarios.id))
    .where(
      and(
        eq(usuarios.torneoId, torneoId),
        eq(usuarios.rol, 'participante'),
        isNull(beneficios.id),
      ),
    )

  for (const usuario of sinBeneficio) {
    const clave: ClaveBeneficio =
      usuario.categoria === 'senior'
        ? elegirAleatorio(CLAVES_DESVENTAJA)
        : elegirAleatorio(CLAVES_VENTAJA)
    await db.insert(beneficios).values({ usuarioId: usuario.id, clave })
  }
}
```

- [ ] **Step 4: Escribir los tests**

```typescript
// tests/beneficios-asignar.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '../src/server/db/client'
import { torneos, usuarios, beneficios } from '../src/server/db/schema'
import { asignarBeneficios } from '../src/server/beneficios/asignar'
import { CLAVES_VENTAJA, CLAVES_DESVENTAJA } from '../src/shared/beneficios'
import type { Categoria } from '../src/shared/dominio'

async function crearTorneoDePrueba(): Promise<string> {
  const torneoId = crypto.randomUUID()
  await db.insert(torneos).values({
    id: torneoId,
    anio: 9000 + Math.floor(Math.random() * 1000),
  })
  return torneoId
}

async function crearUsuarioDePrueba(
  torneoId: string,
  categoria: Categoria,
): Promise<string> {
  const id = crypto.randomUUID()
  await db.insert(usuarios).values({
    id,
    name: 'Test',
    email: `${id}@example.com`,
    categoria,
    torneoId,
  })
  return id
}

describe('asignarBeneficios', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('asigna una ventaja a invitado/junior y una desventaja a senior', async () => {
    const torneoId = await crearTorneoDePrueba()
    const invitadoId = await crearUsuarioDePrueba(torneoId, 'invitado')
    const juniorId = await crearUsuarioDePrueba(torneoId, 'junior')
    const seniorId = await crearUsuarioDePrueba(torneoId, 'senior')

    await asignarBeneficios(torneoId)

    const [filaInvitado] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, invitadoId))
    expect((CLAVES_VENTAJA as readonly string[]).includes(filaInvitado.clave)).toBe(
      true,
    )

    const [filaJunior] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, juniorId))
    expect((CLAVES_VENTAJA as readonly string[]).includes(filaJunior.clave)).toBe(
      true,
    )

    const [filaSenior] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, seniorId))
    expect(
      (CLAVES_DESVENTAJA as readonly string[]).includes(filaSenior.clave),
    ).toBe(true)
  })

  it('elige el primer elemento del pool cuando Math.random devuelve 0', async () => {
    const torneoId = await crearTorneoDePrueba()
    const seniorId = await crearUsuarioDePrueba(torneoId, 'senior')

    vi.spyOn(Math, 'random').mockReturnValue(0)
    await asignarBeneficios(torneoId)

    const [fila] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, seniorId))
    expect(fila.clave).toBe(CLAVES_DESVENTAJA[0])
  })

  it('no reasigna a quien ya tiene beneficio', async () => {
    const torneoId = await crearTorneoDePrueba()
    const usuarioId = await crearUsuarioDePrueba(torneoId, 'invitado')

    await asignarBeneficios(torneoId)
    const [primeraAsignacion] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, usuarioId))

    await asignarBeneficios(torneoId)
    const filasFinal = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, usuarioId))

    expect(filasFinal.length).toBe(1)
    expect(filasFinal[0].clave).toBe(primeraAsignacion.clave)
  })
})
```

- [ ] **Step 5: Correr los tests**

Run: `npx vitest run tests/beneficios-asignar.test.ts`
Expected: 3 tests PASS. (Requiere `DATABASE_URL` apuntando a MySQL con la tabla `beneficios` ya creada por
el Step 2.)

- [ ] **Step 6: Commit**

```bash
git add src/server/db/schema.ts src/server/beneficios/asignar.ts tests/beneficios-asignar.test.ts
git commit -m "feat: tabla beneficios y asignacion aleatoria por categoria"
```

---

### Task 3: Registro de uso/aplicación

**Files:**
- Create: `src/server/beneficios/registrar.ts`
- Test: `tests/beneficios-registrar.test.ts`

**Interfaces:**
- Consumes: tabla `beneficios`/`usuarios` (Task 2); `CATALOGO_BENEFICIOS`, `CLAVES_DESVENTAJA`,
  `ClaveBeneficio`, `INGENIEROS` de `src/shared/beneficios` (Task 1); `idSchema` de
  `src/server/validacion/comun.ts`; `obtenerUnaFila` de `src/server/db/uno.ts`.
- Produces: `registrarUsoBeneficioSchema` (zod), `type RegistrarUsoBeneficio`, y
  `aplicarUsoBeneficio(input: RegistrarUsoBeneficio): Promise<void>` desde
  `src/server/beneficios/registrar.ts` — usados por Task 4.

- [ ] **Step 1: Escribir la lógica de registro**

```typescript
// src/server/beneficios/registrar.ts
import { z } from 'zod'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { db } from '../db/client'
import { obtenerUnaFila } from '../db/uno'
import { beneficios, usuarios } from '../db/schema'
import { idSchema } from '../validacion/comun'
import {
  CATALOGO_BENEFICIOS,
  CLAVES_DESVENTAJA,
  INGENIEROS,
} from '../../shared/beneficios'
import type { ClaveBeneficio } from '../../shared/beneficios'

export const registrarUsoBeneficioSchema = z.object({
  usuarioId: idSchema,
  objetivoUsuarioId: idSchema.nullable().optional(),
  objetivoIngeniero: z.enum(INGENIEROS).nullable().optional(),
})
export type RegistrarUsoBeneficio = z.infer<typeof registrarUsoBeneficioSchema>

/**
 * Registra (o corrige) el uso de la ventaja/desventaja de un participante.
 * Valida que el tipo de objetivo enviado coincida con lo que pide la clave
 * asignada, y que un participante no sea objetivo de más de una desventaja
 * (la aplicación real es fuera del sistema; esto solo lo registra).
 */
export async function aplicarUsoBeneficio(
  input: RegistrarUsoBeneficio,
): Promise<void> {
  const beneficio = await obtenerUnaFila(
    db.select().from(beneficios).where(eq(beneficios.usuarioId, input.usuarioId)),
  )
  if (!beneficio) {
    throw new Error('Este participante no tiene un beneficio asignado')
  }

  const definicion = CATALOGO_BENEFICIOS[beneficio.clave as ClaveBeneficio]
  const objetivoUsuarioId = input.objetivoUsuarioId ?? null
  const objetivoIngeniero = input.objetivoIngeniero ?? null

  if (definicion.tipoObjetivo === 'ninguno') {
    if (objetivoUsuarioId || objetivoIngeniero) {
      throw new Error('Este beneficio no admite objetivo')
    }
  } else if (definicion.tipoObjetivo === 'ingeniero') {
    if (!objetivoIngeniero) {
      throw new Error('Debes seleccionar un ingeniero')
    }
  } else {
    if (!objetivoUsuarioId) {
      throw new Error('Debes seleccionar un participante objetivo')
    }
    if (objetivoUsuarioId === input.usuarioId) {
      throw new Error('El objetivo no puede ser el mismo participante')
    }
    const objetivo = await obtenerUnaFila(
      db.select().from(usuarios).where(eq(usuarios.id, objetivoUsuarioId)),
    )
    if (!objetivo) {
      throw new Error('Participante objetivo no encontrado')
    }

    if ((CLAVES_DESVENTAJA as readonly string[]).includes(beneficio.clave)) {
      const yaFueObjetivo = await db
        .select({ id: beneficios.id })
        .from(beneficios)
        .where(
          and(
            eq(beneficios.objetivoUsuarioId, objetivoUsuarioId),
            inArray(beneficios.clave, CLAVES_DESVENTAJA),
            ne(beneficios.id, beneficio.id),
          ),
        )
      if (yaFueObjetivo.length > 0) {
        throw new Error('Ese participante ya fue objetivo de otra desventaja')
      }
    }
  }

  await db
    .update(beneficios)
    .set({ usadoEn: new Date(), objetivoUsuarioId, objetivoIngeniero })
    .where(eq(beneficios.id, beneficio.id))
}
```

- [ ] **Step 2: Escribir los tests**

```typescript
// tests/beneficios-registrar.test.ts
import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '../src/server/db/client'
import { torneos, usuarios, beneficios } from '../src/server/db/schema'
import { aplicarUsoBeneficio } from '../src/server/beneficios/registrar'
import type { Categoria } from '../src/shared/dominio'
import type { ClaveBeneficio } from '../src/shared/beneficios'

async function crearTorneoDePrueba(): Promise<string> {
  const torneoId = crypto.randomUUID()
  await db.insert(torneos).values({
    id: torneoId,
    anio: 20000 + Math.floor(Math.random() * 1000),
  })
  return torneoId
}

async function crearUsuarioDePrueba(
  torneoId: string,
  categoria: Categoria,
): Promise<string> {
  const id = crypto.randomUUID()
  await db.insert(usuarios).values({
    id,
    name: 'Test',
    email: `${id}@example.com`,
    categoria,
    torneoId,
  })
  return id
}

async function crearBeneficio(
  usuarioId: string,
  clave: ClaveBeneficio,
): Promise<void> {
  await db.insert(beneficios).values({ usuarioId, clave })
}

describe('aplicarUsoBeneficio', () => {
  it('marca como usada una ventaja sin objetivo (ninguno)', async () => {
    const torneoId = await crearTorneoDePrueba()
    const usuarioId = await crearUsuarioDePrueba(torneoId, 'invitado')
    await crearBeneficio(usuarioId, 'busqueda_google')

    await aplicarUsoBeneficio({ usuarioId })

    const [fila] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, usuarioId))
    expect(fila.usadoEn).not.toBeNull()
  })

  it('rechaza objetivo cuando el beneficio no lo admite', async () => {
    const torneoId = await crearTorneoDePrueba()
    const usuarioId = await crearUsuarioDePrueba(torneoId, 'invitado')
    const otroId = await crearUsuarioDePrueba(torneoId, 'invitado')
    await crearBeneficio(usuarioId, 'nada')

    await expect(
      aplicarUsoBeneficio({ usuarioId, objetivoUsuarioId: otroId }),
    ).rejects.toThrow('Este beneficio no admite objetivo')
  })

  it('exige objetivo participante para una desventaja', async () => {
    const torneoId = await crearTorneoDePrueba()
    const usuarioId = await crearUsuarioDePrueba(torneoId, 'senior')
    await crearBeneficio(usuarioId, 'reiniciar_compu')

    await expect(aplicarUsoBeneficio({ usuarioId })).rejects.toThrow(
      'Debes seleccionar un participante objetivo',
    )
  })

  it('rechaza que el objetivo sea el mismo participante', async () => {
    const torneoId = await crearTorneoDePrueba()
    const usuarioId = await crearUsuarioDePrueba(torneoId, 'senior')
    await crearBeneficio(usuarioId, 'reiniciar_compu')

    await expect(
      aplicarUsoBeneficio({ usuarioId, objetivoUsuarioId: usuarioId }),
    ).rejects.toThrow('El objetivo no puede ser el mismo participante')
  })

  it('registra objetivo ingeniero para consultar_ingeniero', async () => {
    const torneoId = await crearTorneoDePrueba()
    const usuarioId = await crearUsuarioDePrueba(torneoId, 'invitado')
    await crearBeneficio(usuarioId, 'consultar_ingeniero')

    await aplicarUsoBeneficio({ usuarioId, objetivoIngeniero: 'Ingeniero 1' })

    const [fila] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, usuarioId))
    expect(fila.objetivoIngeniero).toBe('Ingeniero 1')
    expect(fila.usadoEn).not.toBeNull()
  })

  it('impide que un participante sea objetivo de una segunda desventaja', async () => {
    const torneoId = await crearTorneoDePrueba()
    const senior1 = await crearUsuarioDePrueba(torneoId, 'senior')
    const senior2 = await crearUsuarioDePrueba(torneoId, 'senior')
    const objetivo = await crearUsuarioDePrueba(torneoId, 'junior')
    await crearBeneficio(senior1, 'reiniciar_compu')
    await crearBeneficio(senior2, 'voltear_pantalla')

    await aplicarUsoBeneficio({ usuarioId: senior1, objetivoUsuarioId: objetivo })

    await expect(
      aplicarUsoBeneficio({ usuarioId: senior2, objetivoUsuarioId: objetivo }),
    ).rejects.toThrow('Ese participante ya fue objetivo de otra desventaja')
  })

  it('permite corregir el mismo registro sin chocar con la regla de no-repeticion', async () => {
    const torneoId = await crearTorneoDePrueba()
    const senior1 = await crearUsuarioDePrueba(torneoId, 'senior')
    const objetivoA = await crearUsuarioDePrueba(torneoId, 'junior')
    const objetivoB = await crearUsuarioDePrueba(torneoId, 'junior')
    await crearBeneficio(senior1, 'reiniciar_compu')

    await aplicarUsoBeneficio({ usuarioId: senior1, objetivoUsuarioId: objetivoA })
    await aplicarUsoBeneficio({ usuarioId: senior1, objetivoUsuarioId: objetivoB })

    const [fila] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, senior1))
    expect(fila.objetivoUsuarioId).toBe(objetivoB)
  })

  it('un objetivo de ventaja (ver_codigo) no cuenta para la regla de desventajas', async () => {
    const torneoId = await crearTorneoDePrueba()
    const invitado = await crearUsuarioDePrueba(torneoId, 'invitado')
    const senior = await crearUsuarioDePrueba(torneoId, 'senior')
    const objetivo = await crearUsuarioDePrueba(torneoId, 'junior')
    await crearBeneficio(invitado, 'ver_codigo')
    await crearBeneficio(senior, 'reiniciar_compu')

    await aplicarUsoBeneficio({ usuarioId: invitado, objetivoUsuarioId: objetivo })
    await aplicarUsoBeneficio({ usuarioId: senior, objetivoUsuarioId: objetivo })

    const [fila] = await db
      .select()
      .from(beneficios)
      .where(eq(beneficios.usuarioId, senior))
    expect(fila.objetivoUsuarioId).toBe(objetivo)
  })
})
```

- [ ] **Step 3: Correr los tests**

Run: `npx vitest run tests/beneficios-registrar.test.ts`
Expected: 7 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/server/beneficios/registrar.ts tests/beneficios-registrar.test.ts
git commit -m "feat: logica de registro de uso de beneficios"
```

---

### Task 4: Server functions e integración

**Files:**
- Create: `src/server/functions/beneficios.ts`
- Create: `src/server/queries/beneficioPropio.ts`
- Modify: `src/server/functions/tournament.ts`
- Modify: `src/server/functions/participantes.ts`

**Interfaces:**
- Consumes: `registrarUsoBeneficioSchema`/`aplicarUsoBeneficio` (Task 3), `asignarBeneficios` (Task 2),
  `requerirAdmin`/`requerirUsuario` (`src/server/auth/middleware.ts`), `obtenerTorneoActual`
  (`src/server/tournament/actual.ts`).
- Produces: server functions `registrarUsoBeneficio` y `obtenerBeneficioPropio` desde
  `src/server/functions/beneficios.ts`; `obtenerParticipantes` (mismo nombre, ya existente) ahora
  devuelve además un campo `beneficio: { clave, usadoEn, objetivoUsuarioId, objetivoUsuarioNombre,
  objetivoIngeniero } | null` por participante; `beneficioPropioQueryOptions()` desde
  `src/server/queries/beneficioPropio.ts`.

- [ ] **Step 1: Crear las server functions de beneficios**

```typescript
// src/server/functions/beneficios.ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { obtenerUnaFila } from '../db/uno'
import { beneficios } from '../db/schema'
import { requerirAdmin, requerirUsuario } from '../auth/middleware'
import {
  registrarUsoBeneficioSchema,
  aplicarUsoBeneficio,
} from '../beneficios/registrar'

export const registrarUsoBeneficio = createServerFn({ method: 'POST' })
  .validator(registrarUsoBeneficioSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)
    await aplicarUsoBeneficio(data)
  })

export const obtenerBeneficioPropio = createServerFn({
  method: 'GET',
}).handler(async () => {
  const request = getRequest()
  const user = await requerirUsuario(request.headers)
  const beneficio = await obtenerUnaFila(
    db.select().from(beneficios).where(eq(beneficios.usuarioId, user.id)),
  )
  if (!beneficio) return null
  return { clave: beneficio.clave, usadoEn: beneficio.usadoEn }
})
```

- [ ] **Step 2: Crear la query de TanStack Query para el beneficio propio**

```typescript
// src/server/queries/beneficioPropio.ts
import { queryOptions } from '@tanstack/react-query'
import { obtenerBeneficioPropio } from '../functions/beneficios'

export function beneficioPropioQueryOptions() {
  return queryOptions({
    queryKey: ['beneficioPropio'],
    queryFn: () => obtenerBeneficioPropio(),
  })
}
```

- [ ] **Step 3: Enganchar la asignación en `iniciarTorneo`**

En `src/server/functions/tournament.ts`, agregar el import junto a los demás:

```typescript
import { asignarBeneficios } from '../beneficios/asignar'
```

Y modificar el handler de `iniciarTorneo` (agregar la llamada antes del `return`):

```typescript
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

    await asignarBeneficios(torneo.id)

    return { iniciadoEn }
  },
)
```

- [ ] **Step 4: Extender `obtenerParticipantes` con los datos de beneficio**

En `src/server/functions/participantes.ts`, agregar los imports:

```typescript
import { alias } from 'drizzle-orm/mysql-core'
import { usuarios, cuentas, envios, preguntasIa, beneficios } from '../db/schema'
```

(reemplaza la línea de import de `../db/schema` existente, agregando `beneficios`).

Reemplazar el cuerpo de `obtenerParticipantes` por:

```typescript
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

    const objetivoUsuario = alias(usuarios, 'objetivoUsuario')
    const filasBeneficios = await db
      .select({
        usuarioId: beneficios.usuarioId,
        clave: beneficios.clave,
        usadoEn: beneficios.usadoEn,
        objetivoUsuarioId: beneficios.objetivoUsuarioId,
        objetivoUsuarioNombre: objetivoUsuario.name,
        objetivoIngeniero: beneficios.objetivoIngeniero,
      })
      .from(beneficios)
      .innerJoin(usuarios, eq(usuarios.id, beneficios.usuarioId))
      .leftJoin(
        objetivoUsuario,
        eq(objetivoUsuario.id, beneficios.objetivoUsuarioId),
      )
      .where(eq(usuarios.torneoId, torneo.id))

    const beneficioPorUsuario = new Map(
      filasBeneficios.map((b) => [b.usuarioId, b]),
    )

    return filas.map((f) => ({
      ...f,
      cantidadEnvios: Number(f.cantidadEnvios),
      beneficio: beneficioPorUsuario.get(f.id) ?? null,
    }))
  },
)
```

- [ ] **Step 5: Verificar tipos y que no se rompió nada existente**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos relacionados a `beneficios`/`participantes.ts`/`tournament.ts`.

Run: `npx vitest run tests/funciones-solo-server-fn.test.ts tests/tournament-functions.test.ts tests/participantes-eliminar.test.ts`
Expected: todos PASS (confirma que `beneficios.ts` no viola la regla de solo exportar server functions, y
que no rompimos nada existente).

- [ ] **Step 6: Commit**

```bash
git add src/server/functions/beneficios.ts src/server/queries/beneficioPropio.ts src/server/functions/tournament.ts src/server/functions/participantes.ts
git commit -m "feat: server functions de beneficios e integracion en iniciarTorneo"
```

---

### Task 5: UI de admin en `/admin/participantes`

**Files:**
- Create: `src/components/BeneficioAdminCelda.tsx`
- Modify: `src/routes/admin/participantes.tsx`

**Interfaces:**
- Consumes: `registrarUsoBeneficio` (Task 4), `CATALOGO_BENEFICIOS`/`ClaveBeneficio`/`INGENIEROS`/
  `Ingeniero` (`src/shared/beneficios`), `ADMIN_INPUT_BASE`/`ADMIN_BUTTON_SECONDARY`
  (`src/components/adminBrandStyles.ts`), `LoadingButton` (`src/components/LoadingButton.tsx`).
- Produces: componente `BeneficioAdminCelda` usado dentro de la tabla de `/admin/participantes`.

- [ ] **Step 1: Crear el componente de celda**

```tsx
// src/components/BeneficioAdminCelda.tsx
import { useState } from 'react'
import { LoadingButton } from '#/components/LoadingButton'
import { ADMIN_INPUT_BASE, ADMIN_BUTTON_SECONDARY } from '#/components/adminBrandStyles'
import { CATALOGO_BENEFICIOS, INGENIEROS } from '#/shared/beneficios'
import type { ClaveBeneficio, Ingeniero } from '#/shared/beneficios'

export type BeneficioParticipante = {
  clave: string
  usadoEn: Date | null
  objetivoUsuarioId: string | null
  objetivoUsuarioNombre: string | null
  objetivoIngeniero: string | null
} | null

export type RegistrarBeneficioInput = {
  usuarioId: string
  objetivoUsuarioId?: string | null
  objetivoIngeniero?: Ingeniero | null
}

export function BeneficioAdminCelda({
  usuarioId,
  beneficio,
  opcionesObjetivo,
  onRegistrar,
  estaGuardando,
}: {
  usuarioId: string
  beneficio: BeneficioParticipante
  opcionesObjetivo: { id: string; nombre: string }[]
  onRegistrar: (input: RegistrarBeneficioInput) => void
  estaGuardando: boolean
}) {
  const [objetivoUsuarioId, setObjetivoUsuarioId] = useState(
    beneficio?.objetivoUsuarioId ?? '',
  )
  const [objetivoIngeniero, setObjetivoIngeniero] = useState(
    beneficio?.objetivoIngeniero ?? '',
  )

  if (!beneficio) {
    return <span className="text-admin-ink-faint">—</span>
  }

  const definicion = CATALOGO_BENEFICIOS[beneficio.clave as ClaveBeneficio]

  function handleRegistrar() {
    onRegistrar({
      usuarioId,
      objetivoUsuarioId:
        definicion.tipoObjetivo === 'participante'
          ? objetivoUsuarioId || null
          : null,
      objetivoIngeniero:
        definicion.tipoObjetivo === 'ingeniero'
          ? ((objetivoIngeniero || null) as Ingeniero | null)
          : null,
    })
  }

  return (
    <div className="flex flex-col gap-1.5 py-1">
      <span className="text-admin-ink-soft">{definicion.texto}</span>

      {definicion.tipoObjetivo === 'participante' && (
        <select
          className={ADMIN_INPUT_BASE}
          value={objetivoUsuarioId}
          onChange={(e) => setObjetivoUsuarioId(e.target.value)}
        >
          <option value="">Elegir participante</option>
          {opcionesObjetivo.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
        </select>
      )}

      {definicion.tipoObjetivo === 'ingeniero' && (
        <select
          className={ADMIN_INPUT_BASE}
          value={objetivoIngeniero}
          onChange={(e) => setObjetivoIngeniero(e.target.value)}
        >
          <option value="">Elegir ingeniero</option>
          {INGENIEROS.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      )}

      <LoadingButton
        className={`self-start ${ADMIN_BUTTON_SECONDARY}`}
        isPending={estaGuardando}
        label={beneficio.usadoEn ? 'Actualizar' : 'Marcar como usada'}
        pendingLabel="Guardando..."
        onClick={handleRegistrar}
        wrapperClassName="inline-flex items-center gap-1"
        spinnerClassName="h-3 w-3"
      />

      {beneficio.usadoEn && (
        <span className="text-[12px] text-admin-ink-faint">
          Usada: {new Date(beneficio.usadoEn).toLocaleString('es-GT')}
          {beneficio.objetivoUsuarioNombre
            ? ` — objetivo: ${beneficio.objetivoUsuarioNombre}`
            : ''}
          {beneficio.objetivoIngeniero
            ? ` — ingeniero: ${beneficio.objetivoIngeniero}`
            : ''}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Usar el componente en `/admin/participantes`**

En `src/routes/admin/participantes.tsx`, agregar los imports:

```typescript
import { registrarUsoBeneficio } from '#/server/functions/beneficios'
import {
  BeneficioAdminCelda,
  type RegistrarBeneficioInput,
} from '#/components/BeneficioAdminCelda'
```

Agregar, dentro de `AdminParticipantsPage`, junto a las otras mutaciones (después de la mutación
`reenviar`):

```typescript
const registrarBeneficio = useToastMutation({
  mutationFn: (input: RegistrarBeneficioInput) =>
    registrarUsoBeneficio({ data: input }),
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: participantesQueryOptions().queryKey,
    })
    toast.success('Beneficio registrado.')
  },
})
```

Agregar la columna al `<thead>` (después de "Envíos"):

```tsx
<th className="p-3">Beneficio</th>
```

Y, dentro del `<tbody>`, agregar la celda correspondiente (después de la celda de "Envíos", antes de
"Acciones"):

```tsx
<td className="p-3">
  <BeneficioAdminCelda
    usuarioId={p.id}
    beneficio={p.beneficio}
    opcionesObjetivo={participantes
      .filter((x) => x.id !== p.id)
      .map((x) => ({ id: x.id, nombre: x.nombre }))}
    onRegistrar={(input) => registrarBeneficio.mutate(input)}
    estaGuardando={
      registrarBeneficio.isPending &&
      registrarBeneficio.variables?.usuarioId === p.id
    }
  />
</td>
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 4: Probar manualmente**

Run: `npm run dev`
1. Como admin, crear un torneo, registrar al menos un participante `invitado`/`junior` y uno `senior`.
2. Iniciar el torneo desde `/admin/torneo`.
3. Ir a `/admin/participantes` y confirmar que aparece la columna "Beneficio" con el texto asignado a
   cada uno.
4. Para el participante con una clave de tipo `participante` (ej. `ver_codigo` o una desventaja), elegir
   un objetivo del selector y presionar "Marcar como usada" — confirmar que aparece "Usada: ..." con el
   nombre del objetivo.
5. Si algún senior recibió una desventaja, aplicarla contra un participante, y luego intentar aplicar
   otra desventaja de otro senior contra el mismo participante — debe fallar con el toast de error "Ese
   participante ya fue objetivo de otra desventaja".

- [ ] **Step 5: Commit**

```bash
git add src/components/BeneficioAdminCelda.tsx src/routes/admin/participantes.tsx
git commit -m "feat: registrar uso de beneficios desde admin/participantes"
```

---

### Task 6: Vista del participante en `/perfil`

**Files:**
- Modify: `src/routes/_app/perfil.tsx`

**Interfaces:**
- Consumes: `beneficioPropioQueryOptions` (Task 4), `CATALOGO_BENEFICIOS`/`ClaveBeneficio`
  (`src/shared/beneficios`).

- [ ] **Step 1: Agregar la tarjeta de beneficio a `/perfil`**

Reemplazar el contenido de `src/routes/_app/perfil.tsx` por:

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { usuarioActualQueryOptions } from '#/server/queries/usuarioActual'
import { beneficioPropioQueryOptions } from '#/server/queries/beneficioPropio'
import { QrCode } from '#/components/QrCode'
import { CornerFrame } from '#/components/CornerFrame'
import { LogroBanner } from '#/components/LogroBanner'
import { CARD, GRADIENT_TEXT, PILL_BASE } from '#/components/brandStyles'
import { CATALOGO_BENEFICIOS } from '#/shared/beneficios'
import type { ClaveBeneficio } from '#/shared/beneficios'

export const Route = createFileRoute('/_app/perfil')({
  loader: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      usuarioActualQueryOptions(),
    )
    if (user.rol === 'admin') {
      throw redirect({ to: '/admin/participantes' })
    }
    await context.queryClient.ensureQueryData(beneficioPropioQueryOptions())
  },
  component: ProfilePage,
})

function ProfilePage() {
  const { data: user } = useSuspenseQuery(usuarioActualQueryOptions())
  const { data: beneficio } = useSuspenseQuery(beneficioPropioQueryOptions())

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-6 px-6 py-10">
      <div
        className={`${CARD} flex flex-col items-center gap-4 p-8 text-center`}
      >
        <h1 className={`font-display text-xl font-bold ${GRADIENT_TEXT}`}>
          Hola, {user.name}
        </h1>
        <p className="text-[14px] text-ink-soft">
          Muestra este código al llegar al evento para hacer check-in:
        </p>
        <CornerFrame className="rounded bg-paper-soft p-4">
          <QrCode value={user.tokenIngreso} />
        </CornerFrame>
        {user.ingresadoEn ? (
          <LogroBanner>✦ Ya hiciste check-in ✦</LogroBanner>
        ) : (
          <span className={`${PILL_BASE} border border-line text-ink-faint`}>
            Aún no has hecho check-in
          </span>
        )}
      </div>

      {beneficio && (
        <div
          className={`${CARD} flex flex-col items-center gap-3 p-6 text-center`}
        >
          <h2 className={`font-display text-lg font-bold ${GRADIENT_TEXT}`}>
            Tu ventaja/desventaja
          </h2>
          <p className="text-[14px] text-ink-soft">
            {CATALOGO_BENEFICIOS[beneficio.clave as ClaveBeneficio].texto}
          </p>
          {beneficio.usadoEn ? (
            <LogroBanner>✦ Ya se aplicó ✦</LogroBanner>
          ) : (
            <span className={`${PILL_BASE} border border-line text-ink-faint`}>
              Aún no se ha aplicado
            </span>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 3: Probar manualmente**

Run: `npm run dev`
1. Iniciar sesión como uno de los participantes de prueba creados en la Task 5.
2. Ir a `/perfil` y confirmar que aparece la tarjeta "Tu ventaja/desventaja" con el texto correcto.
3. Desde `/admin/participantes`, marcar esa ventaja/desventaja como usada.
4. Recargar `/perfil` y confirmar que ahora muestra "✦ Ya se aplicó ✦".

- [ ] **Step 4: Commit**

```bash
git add src/routes/_app/perfil.tsx
git commit -m "feat: mostrar ventaja/desventaja asignada en el perfil del participante"
```

---

## Self-Review Notes

- **Spec coverage:** catálogo (Task 1), tabla + asignación automática al iniciar torneo (Tasks 2 y 4),
  registro de uso con las validaciones de tipoObjetivo y no-repetición de objetivo de desventaja (Task
  3), UI de admin dentro de `/admin/participantes` (Task 5), vista del participante en `/perfil` (Task
  6), ingenieros como enum hardcodeado sin tabla (Task 1). Todo lo del spec del 2026-07-23 está cubierto.
- **Placeholders:** el único placeholder intencional es `INGENIEROS` (aprobado explícitamente por el
  usuario); no hay TBDs ni pasos sin código real.
- **Consistencia de tipos:** `ClaveBeneficio`/`Ingeniero`/`CATALOGO_BENEFICIOS` (Task 1) se usan con los
  mismos nombres en Tasks 2–6; `aplicarUsoBeneficio`/`registrarUsoBeneficioSchema` (Task 3) se importan
  sin renombrar en Task 4; el shape de `beneficio` devuelto por `obtenerParticipantes` (Task 4) coincide
  campo por campo con `BeneficioParticipante` en `BeneficioAdminCelda` (Task 5).
