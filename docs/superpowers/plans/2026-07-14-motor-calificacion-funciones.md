# Motor de calificación basado en funciones multi-lenguaje — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el juez stdin/stdout por un motor de invocación de función tipada en 5 lenguajes (Python, JavaScript, Java, C#, PHP), con casos ocultos obligatorios y ranking por puntos.

**Architecture:** El servidor genera, por cada caso de prueba, el código fuente completo a mandar a Piston: el código del participante + un driver que llama la función con argumentos embebidos como literales nativos del lenguaje y que imprime el resultado en un formato canónico propio (no el `print`/`echo` nativo). La comparación es texto exacto entre esa salida y un texto canónico equivalente calculado del lado del servidor a partir de `salidaEsperada`. Ver spec: `docs/superpowers/specs/2026-07-14-motor-calificacion-funciones-design.md`.

**Tech Stack:** TypeScript, TanStack Start (server functions), Drizzle ORM + MySQL, Piston (self-hosted), Vitest, React 19, Monaco Editor.

## Global Constraints

- Reemplazo completo del juez stdin/stdout — no hay modo dual, no hay migración de datos (no hay problemas reales cargados).
- Lenguajes soportados: `python`, `javascript`, `java`, `csharp`, `php`.
- Tipos de dato soportados: `int`, `float`, `bool`, `string`, `list<int>`, `list<float>`, `list<bool>`, `list<string>` — sin diccionarios/objetos ni listas anidadas.
- Todo problema requiere: mínimo 4 casos de prueba, no todas las `salidaEsperada` iguales, al menos 1 caso `visible=true`, al menos 1 caso `visible=false` (validación dura al guardar).
- Run y Submit corren siempre contra TODOS los casos de un problema (visibles + ocultos) — mismo veredicto en ambos. El servidor nunca debe incluir `argumentos`/`salidaEsperada`/`salidaObtenida` de un caso oculto en la respuesta al cliente — se filtra en el servidor, no solo en la UI.
- Nombre de función y código inicial se escriben a mano por el admin, por cada lenguaje habilitado — no se auto-detectan ni se traducen entre lenguajes.
- `npm test` corre `vitest run`. `npx drizzle-kit push` aplica el schema contra `DATABASE_URL` (no hay carpeta de migraciones versionadas — modo push).
- Convenciones existentes: identificadores/comentarios en español, sin emojis salvo los ya usados en la UI (✅/❌/💡), archivos de test en `tests/`, imports con alias `#/*` → `src/*`.

---

### Task 1: Tipos canónicos de dato

**Files:**
- Create: `src/server/judge/tipos.ts`
- Test: `tests/judge-tipos.test.ts`

**Interfaces:**
- Produces: `TipoEscalar`, `TipoDato`, `Parametro`, `ValorEscalar`, `Valor`, `tipoEscalarDeLista(tipo: TipoDato): TipoEscalar | null`, `valorCoincideConTipo(valor: unknown, tipo: TipoDato): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { tipoEscalarDeLista, valorCoincideConTipo } from '../src/server/judge/tipos'

describe('tipoEscalarDeLista', () => {
  it('extrae el escalar de un tipo lista', () => {
    expect(tipoEscalarDeLista('list<int>')).toBe('int')
    expect(tipoEscalarDeLista('list<string>')).toBe('string')
  })

  it('devuelve null para un tipo escalar', () => {
    expect(tipoEscalarDeLista('int')).toBeNull()
  })
})

describe('valorCoincideConTipo', () => {
  it('valida escalares', () => {
    expect(valorCoincideConTipo(3, 'int')).toBe(true)
    expect(valorCoincideConTipo(3.5, 'int')).toBe(false)
    expect(valorCoincideConTipo(3.5, 'float')).toBe(true)
    expect(valorCoincideConTipo(true, 'bool')).toBe(true)
    expect(valorCoincideConTipo('hola', 'string')).toBe(true)
    expect(valorCoincideConTipo('hola', 'int')).toBe(false)
  })

  it('valida listas de escalares', () => {
    expect(valorCoincideConTipo([1, 2, 3], 'list<int>')).toBe(true)
    expect(valorCoincideConTipo([1, 'x'], 'list<int>')).toBe(false)
    expect(valorCoincideConTipo([], 'list<int>')).toBe(true)
    expect(valorCoincideConTipo('no es lista', 'list<int>')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/judge-tipos.test.ts`
Expected: FAIL with "Cannot find module '../src/server/judge/tipos'"

- [ ] **Step 3: Write implementation**

```ts
export type TipoEscalar = 'int' | 'float' | 'bool' | 'string'
export type TipoDato = TipoEscalar | `list<${TipoEscalar}>`

export type Parametro = { nombre: string; tipo: TipoDato }

export type ValorEscalar = number | boolean | string
export type Valor = ValorEscalar | ValorEscalar[]

export function tipoEscalarDeLista(tipo: TipoDato): TipoEscalar | null {
  const coincidencia = /^list<(int|float|bool|string)>$/.exec(tipo)
  return coincidencia ? (coincidencia[1] as TipoEscalar) : null
}

function valorCoincideConEscalar(valor: unknown, tipo: TipoEscalar): boolean {
  if (tipo === 'int') return typeof valor === 'number' && Number.isInteger(valor)
  if (tipo === 'float') return typeof valor === 'number'
  if (tipo === 'bool') return typeof valor === 'boolean'
  return typeof valor === 'string'
}

export function valorCoincideConTipo(valor: unknown, tipo: TipoDato): boolean {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    return Array.isArray(valor) && valor.every((v) => valorCoincideConEscalar(v, escalar))
  }
  return valorCoincideConEscalar(valor, tipo as TipoEscalar)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/judge-tipos.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/judge/tipos.ts tests/judge-tipos.test.ts
git commit -m "feat: agregar tipos canónicos de dato para el motor de funciones"
```

---

### Task 2: Serializador canónico de salida

**Files:**
- Create: `src/server/judge/serializar.ts`
- Test: `tests/judge-serializar.test.ts`

**Interfaces:**
- Consumes: `TipoDato`, `Valor`, `tipoEscalarDeLista` de Task 1.
- Produces: `serializarCanonico(valor: Valor, tipo: TipoDato): string`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { serializarCanonico } from '../src/server/judge/serializar'

describe('serializarCanonico', () => {
  it('serializa escalares', () => {
    expect(serializarCanonico(3, 'int')).toBe('3')
    expect(serializarCanonico(-4, 'int')).toBe('-4')
    expect(serializarCanonico('hola', 'string')).toBe('hola')
    expect(serializarCanonico(true, 'bool')).toBe('true')
    expect(serializarCanonico(false, 'bool')).toBe('false')
  })

  it('serializa listas con el mismo formato en todos los tipos', () => {
    expect(serializarCanonico([2, 4, 6], 'list<int>')).toBe('[2, 4, 6]')
    expect(serializarCanonico([], 'list<int>')).toBe('[]')
    expect(serializarCanonico([true, false], 'list<bool>')).toBe('[true, false]')
    expect(serializarCanonico(['a', 'b'], 'list<string>')).toBe('[a, b]')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/judge-serializar.test.ts`
Expected: FAIL with "Cannot find module '../src/server/judge/serializar'"

- [ ] **Step 3: Write implementation**

```ts
import type { TipoDato, TipoEscalar, Valor } from './tipos'
import { tipoEscalarDeLista } from './tipos'

function formatearEscalar(valor: unknown, tipo: TipoEscalar): string {
  if (tipo === 'bool') return valor ? 'true' : 'false'
  return String(valor)
}

export function serializarCanonico(valor: Valor, tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    const lista = valor as unknown[]
    return '[' + lista.map((v) => formatearEscalar(v, escalar)).join(', ') + ']'
  }
  return formatearEscalar(valor, tipo as TipoEscalar)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/judge-serializar.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/judge/serializar.ts tests/judge-serializar.test.ts
git commit -m "feat: agregar serializador canónico de salida del juez"
```

---

### Task 3: Esquema de datos — problemas, problema_lenguajes, casos_prueba

**Files:**
- Modify: `src/server/db/schema.ts`
- Modify: `tests/db.test.ts`

**Interfaces:**
- Consumes: `Parametro`, `TipoDato`, `Valor` de Task 1.
- Produces: tablas `problemas` (con `parametros`, `tipoRetorno`, `puntos`; sin `lenguajesPermitidos`), `problemaLenguajes` (nueva), `casosPrueba` (con `argumentos`, `salidaEsperada` como JSON, `visible`).

- [ ] **Step 1: Modificar `problemas`, agregar `problemaLenguajes`, modificar `casosPrueba`**

En `src/server/db/schema.ts`, agregar el import y reemplazar las tres definiciones:

```ts
import type { Parametro, Valor } from '../judge/tipos'
```

```ts
export const problemas = mysqlTable('problemas', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  titulo: text('titulo').notNull(),
  descripcion: text('descripcion').notNull(),
  dificultad: text('dificultad').notNull(),
  orden: int('orden').notNull().default(0),
  grupo: mysqlEnum('grupo', ['invitado_junior', 'senior']).notNull(),
  puntos: int('puntos').notNull().default(10),
  parametros: json('parametros').$type<Parametro[]>().notNull(),
  tipoRetorno: mysqlEnum('tipo_retorno', [
    'int',
    'float',
    'bool',
    'string',
    'list<int>',
    'list<float>',
    'list<bool>',
    'list<string>',
  ]).notNull(),
})

export const problemaLenguajes = mysqlTable(
  'problema_lenguajes',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    problemaId: varchar('problema_id', { length: 36 })
      .notNull()
      .references(() => problemas.id, { onDelete: 'cascade' }),
    lenguaje: mysqlEnum('lenguaje', ['python', 'javascript', 'java', 'csharp', 'php']).notNull(),
    nombreFuncion: text('nombre_funcion').notNull(),
    codigoInicial: text('codigo_inicial').notNull(),
  },
  (table) => [unique('problema_lenguajes_unico').on(table.problemaId, table.lenguaje)],
)

export const casosPrueba = mysqlTable('casos_prueba', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  problemaId: varchar('problema_id', { length: 36 })
    .notNull()
    .references(() => problemas.id, { onDelete: 'cascade' }),
  argumentos: json('argumentos').$type<Valor[]>().notNull(),
  salidaEsperada: json('salida_esperada').$type<Valor>().notNull(),
  visible: boolean('visible').notNull().default(true),
})
```

- [ ] **Step 2: Aplicar el schema contra la base de datos de desarrollo**

Run: `npx drizzle-kit push`

Es un comando interactivo: va a detectar que se eliminan columnas (`lenguajes_permitidos` de `problemas`, `entrada`/`salida_esperada` viejas de `casos_prueba`) y se agregan otras nuevas. Confirmar cada prompt de "Is ... table created or renamed" eligiendo "create table"/"create column" (no "rename"), y confirmar los drops — no hay datos reales que preservar.

- [ ] **Step 3: Actualizar los inserts de `problemas` en `tests/db.test.ts`**

Reemplazar los dos bloques que insertan en `problemas`:

```ts
  it('acepta un problema con grupo invitado_junior o senior', async () => {
    const id = crypto.randomUUID()
    await db.insert(problemas).values({
      id,
      titulo: 'Suma',
      descripcion: 'Suma dos números',
      dificultad: 'easy',
      grupo: 'senior',
      puntos: 10,
      parametros: [{ nombre: 'a', tipo: 'int' }],
      tipoRetorno: 'int',
    })
    const rows = await db.select().from(problemas).where(eq(problemas.id, id))
    expect(rows[0]?.grupo).toBe('senior')
  })

  it('incrementa el contador de corridas con onDuplicateKeyUpdate', async () => {
    const usuarioId = crypto.randomUUID()
    await db.insert(usuarios).values({
      id: usuarioId,
      name: 'Beto',
      email: `beto-${usuarioId}@example.com`,
      categoria: 'invitado',
    })
    const problemaId = crypto.randomUUID()
    await db.insert(problemas).values({
      id: problemaId,
      titulo: 'P',
      descripcion: 'd',
      dificultad: 'easy',
      grupo: 'invitado_junior',
      puntos: 10,
      parametros: [],
      tipoRetorno: 'int',
    })
```

(el resto del segundo test no cambia).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/db.test.ts`
Expected: PASS (requiere `DATABASE_URL` apuntando a una MySQL de desarrollo alcanzable, igual que hoy)

- [ ] **Step 5: Commit**

```bash
git add src/server/db/schema.ts tests/db.test.ts
git commit -m "feat: rediseñar schema de problemas/casos de prueba para el motor de funciones"
```

---

### Task 4: Hardening y nueva firma de `ejecutarPiston`

**Files:**
- Modify: `src/server/piston/client.ts`
- Modify: `tests/piston-client.test.ts`

**Interfaces:**
- Produces: `ejecutarPiston(lenguaje: string, nombreArchivo: string, codigo: string): Promise<ResultadoPiston>` (firma nueva — ya no recibe `entradaEstandar`, recibe `nombreArchivo`).

- [ ] **Step 1: Reescribir las pruebas existentes con la nueva firma**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ejecutarPiston } from '../src/server/piston/client'

describe('ejecutarPiston', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends the mapped language/version, filename and resource limits', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ run: { stdout: 'hi\n', stderr: '', code: 0, signal: null } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const resultado = await ejecutarPiston('python', 'main.py', 'print("hi")')

    expect(resultado).toEqual({ salidaEstandar: 'hi\n', salidaError: '', codigoSalida: 0, tiempoExcedido: false })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v2/execute')
    const body = JSON.parse(options.body)
    expect(body.language).toBe('python')
    expect(body.files[0].name).toBe('main.py')
    expect(body.files[0].content).toBe('print("hi")')
    expect(body.run_timeout).toBe(5000)
    expect(body.compile_timeout).toBe(10000)
    expect(body.run_memory_limit).toBe(268435456)
    expect(body.compile_memory_limit).toBe(268435456)
  })

  it('marks timedOut when Piston reports SIGKILL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ run: { stdout: '', stderr: '', code: 1, signal: 'SIGKILL' } }),
      }),
    )
    const resultado = await ejecutarPiston('python', 'main.py', 'while True: pass')
    expect(resultado.tiempoExcedido).toBe(true)
  })

  it('throws for an unsupported language', async () => {
    await expect(ejecutarPiston('cobol', 'main.cob', 'x')).rejects.toThrow('Lenguaje no soportado: cobol')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/piston-client.test.ts`
Expected: FAIL (la firma actual es `(lenguaje, codigo, entradaEstandar)`, sin `nombreArchivo` ni límites nuevos)

- [ ] **Step 3: Reescribir `client.ts`**

```ts
import { MAPA_LENGUAJES } from './languages'

export type ResultadoPiston = {
  salidaEstandar: string
  salidaError: string
  codigoSalida: number
  tiempoExcedido: boolean
}

export async function ejecutarPiston(
  lenguaje: string,
  nombreArchivo: string,
  codigo: string,
): Promise<ResultadoPiston> {
  const mapeo = MAPA_LENGUAJES[lenguaje]
  if (!mapeo) {
    throw new Error(`Lenguaje no soportado: ${lenguaje}`)
  }

  const pistonUrl = process.env.PISTON_URL ?? 'http://localhost:2000'
  const response = await fetch(`${pistonUrl}/api/v2/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: mapeo.language,
      version: mapeo.version,
      files: [{ name: nombreArchivo, content: codigo }],
      run_timeout: 5000,
      compile_timeout: 10000,
      run_memory_limit: 268435456,
      compile_memory_limit: 268435456,
    }),
  })

  if (!response.ok) {
    throw new Error(`La solicitud a Piston falló: ${response.status}`)
  }

  const data = await response.json()
  const run = data.run
  return {
    salidaEstandar: run.stdout ?? '',
    salidaError: run.stderr ?? '',
    codigoSalida: run.code ?? 1,
    tiempoExcedido: run.signal === 'SIGKILL',
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/piston-client.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/piston/client.ts tests/piston-client.test.ts
git commit -m "feat: agregar límites de compilación/memoria a Piston y quitar stdin"
```

---

### Task 5: Extender lenguajes soportados (Java, C#, PHP)

**Files:**
- Modify: `src/server/piston/languages.ts`
- Modify: `scripts/install-piston-languages.sh`
- Modify: `docs/deployment.md`
- Test: `tests/piston-languages.test.ts`

**Interfaces:**
- Produces: `MAPA_LENGUAJES` con entradas para `java`, `csharp`, `php` además de `python`/`javascript`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { MAPA_LENGUAJES } from '../src/server/piston/languages'

describe('MAPA_LENGUAJES', () => {
  it('incluye los 5 lenguajes soportados por el motor de funciones', () => {
    expect(Object.keys(MAPA_LENGUAJES).sort()).toEqual(
      ['csharp', 'java', 'javascript', 'php', 'python'].sort(),
    )
  })

  it('cada entrada tiene language y version no vacíos', () => {
    for (const [, mapeo] of Object.entries(MAPA_LENGUAJES)) {
      expect(mapeo.language.length).toBeGreaterThan(0)
      expect(mapeo.version.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/piston-languages.test.ts`
Expected: FAIL (faltan las 3 entradas nuevas)

- [ ] **Step 3: Consultar los paquetes disponibles en la instancia real de Piston**

Este paso requiere acceso a la instancia de Piston desplegada (o una local con `docker run -p 2000:2000 ghcr.io/engineer-man/piston`). Correr:

```bash
curl -s "$PISTON_URL/api/v2/packages" | grep -E '"language":"(java|csharp|php)"'
```

Anotar el `version` exacto que reporte para cada uno de los tres lenguajes — Piston exige coincidencia exacta de versión instalada, no acepta comodines. Usar esos valores concretos en el Step 4 (reemplazar los que se muestran aquí solo como referencia si difieren).

- [ ] **Step 4: Actualizar `languages.ts`**

```ts
export const MAPA_LENGUAJES: Record<string, { language: string; version: string }> = {
  python: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
  java: { language: 'java', version: '15.0.2' },
  csharp: { language: 'csharp', version: '6.12.0' },
  php: { language: 'php', version: '8.2.3' },
}
```

Reemplazar `java`/`csharp`/`php` con los valores confirmados en el Step 3.

- [ ] **Step 5: Actualizar el script de instalación**

```bash
#!/usr/bin/env bash
set -euo pipefail

PISTON_URL="${1:?Usage: install-piston-languages.sh <piston-url>}"

for pkg in \
  '{"language":"python","version":"3.10.0"}' \
  '{"language":"javascript","version":"18.15.0"}' \
  '{"language":"java","version":"15.0.2"}' \
  '{"language":"csharp","version":"6.12.0"}' \
  '{"language":"php","version":"8.2.3"}'; do
  curl -sf -X POST "$PISTON_URL/api/v2/packages" -H "Content-Type: application/json" -d "$pkg"
done
```

Usar en ambos archivos exactamente los mismos valores de versión confirmados en el Step 3.

- [ ] **Step 6: Actualizar `docs/deployment.md`**

En la sección "Step 3: Install Language Runtimes", cambiar:

```
The script installs Python 3.10.0 and JavaScript 18.15.0 runtimes.
```

por:

```
The script installs Python, JavaScript, Java, C# and PHP runtimes (see `scripts/install-piston-languages.sh` for exact pinned versions).
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run tests/piston-languages.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 8: Commit**

```bash
git add src/server/piston/languages.ts scripts/install-piston-languages.sh docs/deployment.md tests/piston-languages.test.ts
git commit -m "feat: agregar Java, C# y PHP como lenguajes soportados en Piston"
```

---

### Task 6: Driver de Python

**Files:**
- Create: `src/server/judge/harness/python.ts`
- Test: `tests/harness-python.test.ts`

**Interfaces:**
- Consumes: `Parametro`, `TipoDato`, `Valor`, `tipoEscalarDeLista` de Task 1.
- Produces: `generarProgramaPython(codigoParticipante, nombreFuncion, parametros, tipoRetorno, argumentos): { archivo: string; contenido: string }`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { generarProgramaPython } from '../src/server/judge/harness/python'

describe('generarProgramaPython', () => {
  it('embebe argumentos escalares y llama la función', () => {
    const { archivo, contenido } = generarProgramaPython(
      'def contar_vocales(texto):\n    return 0',
      'contar_vocales',
      [{ nombre: 'texto', tipo: 'string' }],
      'int',
      ['hola'],
    )
    expect(archivo).toBe('main.py')
    expect(contenido).toContain('def contar_vocales(texto):')
    expect(contenido).toContain('contar_vocales("hola")')
    expect(contenido).toContain('print(__resultado_juez__)')
  })

  it('embebe listas y booleanos como literales Python', () => {
    const { contenido } = generarProgramaPython(
      'def f(numeros, activo):\n    return numeros',
      'f',
      [
        { nombre: 'numeros', tipo: 'list<int>' },
        { nombre: 'activo', tipo: 'bool' },
      ],
      'list<int>',
      [[1, 2, 3], true],
    )
    expect(contenido).toContain('f([1, 2, 3], True)')
  })

  it('serializa un retorno list<bool> con el formato canónico', () => {
    const { contenido } = generarProgramaPython(
      'def f(x):\n    return [True, False]',
      'f',
      [{ nombre: 'x', tipo: 'int' }],
      'list<bool>',
      [1],
    )
    expect(contenido).toContain("'true' if x else 'false'")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/harness-python.test.ts`
Expected: FAIL with "Cannot find module '../src/server/judge/harness/python'"

- [ ] **Step 3: Write implementation**

```ts
import type { Parametro, TipoDato, Valor } from '../tipos'
import { tipoEscalarDeLista } from '../tipos'

function literalPython(valor: unknown, tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    const lista = valor as unknown[]
    return '[' + lista.map((v) => literalPython(v, escalar)).join(', ') + ']'
  }
  if (tipo === 'bool') return valor ? 'True' : 'False'
  if (tipo === 'string') return JSON.stringify(valor)
  return String(valor)
}

function lineaImpresion(tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    if (escalar === 'bool') {
      return "print('[' + ', '.join('true' if x else 'false' for x in __resultado_juez__) + ']')"
    }
    return "print('[' + ', '.join(str(x) for x in __resultado_juez__) + ']')"
  }
  if (tipo === 'bool') return "print('true' if __resultado_juez__ else 'false')"
  return 'print(__resultado_juez__)'
}

export function generarProgramaPython(
  codigoParticipante: string,
  nombreFuncion: string,
  parametros: Parametro[],
  tipoRetorno: TipoDato,
  argumentos: Valor[],
): { archivo: string; contenido: string } {
  const args = argumentos.map((v, i) => literalPython(v, parametros[i].tipo)).join(', ')
  const contenido = [
    codigoParticipante,
    '',
    `__resultado_juez__ = ${nombreFuncion}(${args})`,
    lineaImpresion(tipoRetorno),
  ].join('\n')
  return { archivo: 'main.py', contenido }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/harness-python.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/judge/harness/python.ts tests/harness-python.test.ts
git commit -m "feat: agregar generador de driver Python"
```

---

### Task 7: Driver de JavaScript

**Files:**
- Create: `src/server/judge/harness/javascript.ts`
- Test: `tests/harness-javascript.test.ts`

**Interfaces:**
- Consumes: mismos tipos de Task 1.
- Produces: `generarProgramaJavascript(...)` con la misma forma que Task 6.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { generarProgramaJavascript } from '../src/server/judge/harness/javascript'

describe('generarProgramaJavascript', () => {
  it('embebe argumentos y llama la función', () => {
    const { archivo, contenido } = generarProgramaJavascript(
      'function contarVocales(texto) {\n  return 0;\n}',
      'contarVocales',
      [{ nombre: 'texto', tipo: 'string' }],
      'int',
      ['hola'],
    )
    expect(archivo).toBe('main.js')
    expect(contenido).toContain('contarVocales("hola")')
    expect(contenido).toContain('console.log(String(__resultado_juez__))')
  })

  it('serializa listas con el formato canónico', () => {
    const { contenido } = generarProgramaJavascript(
      'function f(n) { return n.map(x => x * 2); }',
      'f',
      [{ nombre: 'n', tipo: 'list<int>' }],
      'list<int>',
      [[1, 2, 3]],
    )
    expect(contenido).toContain('f([1, 2, 3])')
    expect(contenido).toContain("__resultado_juez__.map(function(x) { return String(x); }).join(', ')")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/harness-javascript.test.ts`
Expected: FAIL with "Cannot find module '../src/server/judge/harness/javascript'"

- [ ] **Step 3: Write implementation**

```ts
import type { Parametro, TipoDato, Valor } from '../tipos'
import { tipoEscalarDeLista } from '../tipos'

function literalJs(valor: unknown, tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    const lista = valor as unknown[]
    return '[' + lista.map((v) => literalJs(v, escalar)).join(', ') + ']'
  }
  if (tipo === 'string') return JSON.stringify(valor)
  return String(valor)
}

function lineaImpresion(tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    return "console.log('[' + __resultado_juez__.map(function(x) { return String(x); }).join(', ') + ']')"
  }
  return 'console.log(String(__resultado_juez__))'
}

export function generarProgramaJavascript(
  codigoParticipante: string,
  nombreFuncion: string,
  parametros: Parametro[],
  tipoRetorno: TipoDato,
  argumentos: Valor[],
): { archivo: string; contenido: string } {
  const args = argumentos.map((v, i) => literalJs(v, parametros[i].tipo)).join(', ')
  const contenido = [
    codigoParticipante,
    '',
    `var __resultado_juez__ = ${nombreFuncion}(${args});`,
    lineaImpresion(tipoRetorno),
  ].join('\n')
  return { archivo: 'main.js', contenido }
}
```

`String(true)`/`String(false)` en JS ya produce `"true"`/`"false"` en minúscula, igual que el formato canónico — no hace falta un caso especial para `bool` en escalar ni en lista.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/harness-javascript.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/judge/harness/javascript.ts tests/harness-javascript.test.ts
git commit -m "feat: agregar generador de driver JavaScript"
```

---

### Task 8: Driver de PHP

**Files:**
- Create: `src/server/judge/harness/php.ts`
- Test: `tests/harness-php.test.ts`

**Interfaces:**
- Consumes: mismos tipos de Task 1.
- Produces: `generarProgramaPhp(...)`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { generarProgramaPhp } from '../src/server/judge/harness/php'

describe('generarProgramaPhp', () => {
  it('antepone la etiqueta <?php aunque el participante no la escriba', () => {
    const { archivo, contenido } = generarProgramaPhp(
      'function contarVocales($texto) {\n  return 0;\n}',
      'contarVocales',
      [{ nombre: 'texto', tipo: 'string' }],
      'int',
      ['hola'],
    )
    expect(archivo).toBe('main.php')
    expect(contenido.startsWith('<?php')).toBe(true)
    expect(contenido).toContain("contarVocales('hola')")
    expect(contenido).toContain('echo $__resultado_juez__;')
  })

  it('escapa comillas simples en strings sin depender de interpolación de $', () => {
    const { contenido } = generarProgramaPhp(
      'function f($x) { return $x; }',
      'f',
      [{ nombre: 'x', tipo: 'string' }],
      'string',
      ["it's $5"],
    )
    expect(contenido).toContain("f('it\\'s $5')")
  })

  it('serializa bool y list<bool> con formato canónico, no con var_dump nativo', () => {
    const { contenido } = generarProgramaPhp(
      'function f($x) { return true; }',
      'f',
      [{ nombre: 'x', tipo: 'int' }],
      'bool',
      [1],
    )
    expect(contenido).toContain("echo $__resultado_juez__ ? 'true' : 'false';")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/harness-php.test.ts`
Expected: FAIL with "Cannot find module '../src/server/judge/harness/php'"

- [ ] **Step 3: Write implementation**

```ts
import type { Parametro, TipoDato, Valor } from '../tipos'
import { tipoEscalarDeLista } from '../tipos'

function literalPhpString(valor: string): string {
  return "'" + valor.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
}

function literalPhp(valor: unknown, tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    const lista = valor as unknown[]
    return '[' + lista.map((v) => literalPhp(v, escalar)).join(', ') + ']'
  }
  if (tipo === 'bool') return valor ? 'true' : 'false'
  if (tipo === 'string') return literalPhpString(valor as string)
  return String(valor)
}

function lineaImpresion(tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    if (escalar === 'bool') {
      return "echo '[' . implode(', ', array_map(function($x) { return $x ? 'true' : 'false'; }, $__resultado_juez__)) . ']';"
    }
    return "echo '[' . implode(', ', array_map('strval', $__resultado_juez__)) . ']';"
  }
  if (tipo === 'bool') return "echo $__resultado_juez__ ? 'true' : 'false';"
  return 'echo $__resultado_juez__;'
}

export function generarProgramaPhp(
  codigoParticipante: string,
  nombreFuncion: string,
  parametros: Parametro[],
  tipoRetorno: TipoDato,
  argumentos: Valor[],
): { archivo: string; contenido: string } {
  const args = argumentos.map((v, i) => literalPhp(v, parametros[i].tipo)).join(', ')
  const contenido = [
    '<?php',
    codigoParticipante,
    '',
    `$__resultado_juez__ = ${nombreFuncion}(${args});`,
    lineaImpresion(tipoRetorno),
  ].join('\n')
  return { archivo: 'main.php', contenido }
}
```

Se usan strings de PHP con comillas simples (no dobles) precisamente para no depender de la interpolación de variables `$x`/`{$x}` que PHP hace dentro de comillas dobles — si el texto del participante contiene un `$`, con comillas dobles PHP intentaría interpolarlo como variable.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/harness-php.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/judge/harness/php.ts tests/harness-php.test.ts
git commit -m "feat: agregar generador de driver PHP"
```

---

### Task 9: Driver de Java

**Files:**
- Create: `src/server/judge/harness/java.ts`
- Test: `tests/harness-java.test.ts`

**Interfaces:**
- Consumes: mismos tipos de Task 1.
- Produces: `generarProgramaJava(...)`, envuelve el método del participante en una clase `Main`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { generarProgramaJava } from '../src/server/judge/harness/java'

describe('generarProgramaJava', () => {
  it('envuelve el método del participante en la clase Main', () => {
    const { archivo, contenido } = generarProgramaJava(
      '  public static int contarVocales(String texto) {\n    return 0;\n  }',
      'contarVocales',
      [{ nombre: 'texto', tipo: 'string' }],
      'int',
      ['hola'],
    )
    expect(archivo).toBe('Main.java')
    expect(contenido).toContain('public class Main {')
    expect(contenido).toContain('contarVocales("hola")')
    expect(contenido).toContain('System.out.println(String.valueOf(__resultado_juez__));')
  })

  it('usa List.<Tipo>of() para argumentos de lista, tipado explícito', () => {
    const { contenido } = generarProgramaJava(
      '  public static List<Integer> f(List<Integer> n) { return n; }',
      'f',
      [{ nombre: 'n', tipo: 'list<int>' }],
      'list<int>',
      [[1, 2, 3]],
    )
    expect(contenido).toContain('List.<Integer>of(1, 2, 3)')
  })

  it('maneja listas vacías con tipado explícito', () => {
    const { contenido } = generarProgramaJava(
      '  public static List<Integer> f(List<Integer> n) { return n; }',
      'f',
      [{ nombre: 'n', tipo: 'list<int>' }],
      'list<int>',
      [[]],
    )
    expect(contenido).toContain('List.<Integer>of()')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/harness-java.test.ts`
Expected: FAIL with "Cannot find module '../src/server/judge/harness/java'"

- [ ] **Step 3: Write implementation**

```ts
import type { Parametro, TipoDato, TipoEscalar, Valor } from '../tipos'
import { tipoEscalarDeLista } from '../tipos'

function tipoJavaEscalar(tipo: TipoEscalar): string {
  return { int: 'Integer', float: 'Double', bool: 'Boolean', string: 'String' }[tipo]
}

function tipoJavaRetorno(tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) return `List<${tipoJavaEscalar(escalar)}>`
  if (tipo === 'int') return 'int'
  if (tipo === 'float') return 'double'
  if (tipo === 'bool') return 'boolean'
  return 'String'
}

function literalJava(valor: unknown, tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    const lista = valor as unknown[]
    const elementos = lista.map((v) => literalJava(v, escalar)).join(', ')
    return `List.<${tipoJavaEscalar(escalar)}>of(${elementos})`
  }
  if (tipo === 'string') return JSON.stringify(valor)
  return String(valor)
}

function lineasImpresion(tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    return [
      '    List<String> __textos_juez__ = new ArrayList<>();',
      `    for (${tipoJavaEscalar(escalar)} __elemento_juez__ : __resultado_juez__) {`,
      '      __textos_juez__.add(String.valueOf(__elemento_juez__));',
      '    }',
      '    System.out.println("[" + String.join(", ", __textos_juez__) + "]");',
    ].join('\n')
  }
  return '    System.out.println(String.valueOf(__resultado_juez__));'
}

export function generarProgramaJava(
  codigoParticipante: string,
  nombreFuncion: string,
  parametros: Parametro[],
  tipoRetorno: TipoDato,
  argumentos: Valor[],
): { archivo: string; contenido: string } {
  const args = argumentos.map((v, i) => literalJava(v, parametros[i].tipo)).join(', ')
  const contenido = [
    'import java.util.*;',
    '',
    'public class Main {',
    codigoParticipante,
    '',
    '  public static void main(String[] args) {',
    `    ${tipoJavaRetorno(tipoRetorno)} __resultado_juez__ = ${nombreFuncion}(${args});`,
    lineasImpresion(tipoRetorno),
    '  }',
    '}',
  ].join('\n')
  return { archivo: 'Main.java', contenido }
}
```

`String.valueOf(booleano)` en Java ya produce `"true"`/`"false"` en minúscula — no hace falta un caso especial para `bool`, a diferencia de C#/PHP.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/harness-java.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/judge/harness/java.ts tests/harness-java.test.ts
git commit -m "feat: agregar generador de driver Java"
```

---

### Task 10: Driver de C#

**Files:**
- Create: `src/server/judge/harness/csharp.ts`
- Test: `tests/harness-csharp.test.ts`

**Interfaces:**
- Consumes: mismos tipos de Task 1.
- Produces: `generarProgramaCsharp(...)`, envuelve el método del participante en una clase `Program`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { generarProgramaCsharp } from '../src/server/judge/harness/csharp'

describe('generarProgramaCsharp', () => {
  it('envuelve el método del participante en la clase Program', () => {
    const { archivo, contenido } = generarProgramaCsharp(
      '  public static int ContarVocales(string texto) {\n    return 0;\n  }',
      'ContarVocales',
      [{ nombre: 'texto', tipo: 'string' }],
      'int',
      ['hola'],
    )
    expect(archivo).toBe('main.cs')
    expect(contenido).toContain('class Program {')
    expect(contenido).toContain('ContarVocales("hola")')
    expect(contenido).toContain('Console.WriteLine(__resultado_juez__);')
  })

  it('serializa bool en minúscula, no con la capitalización nativa de C#', () => {
    const { contenido } = generarProgramaCsharp(
      '  public static bool F(int x) { return true; }',
      'F',
      [{ nombre: 'x', tipo: 'int' }],
      'bool',
      [1],
    )
    expect(contenido).toContain('Console.WriteLine(__resultado_juez__ ? "true" : "false");')
  })

  it('serializa list<bool> con formato canónico', () => {
    const { contenido } = generarProgramaCsharp(
      '  public static List<bool> F() { return new List<bool> { true, false }; }',
      'F',
      [],
      'list<bool>',
      [],
    )
    expect(contenido).toContain('x ? "true" : "false"')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/harness-csharp.test.ts`
Expected: FAIL with "Cannot find module '../src/server/judge/harness/csharp'"

- [ ] **Step 3: Write implementation**

```ts
import type { Parametro, TipoDato, TipoEscalar, Valor } from '../tipos'
import { tipoEscalarDeLista } from '../tipos'

function tipoCsharpEscalar(tipo: TipoEscalar): string {
  return { int: 'int', float: 'double', bool: 'bool', string: 'string' }[tipo]
}

function literalCsharp(valor: unknown, tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    const lista = valor as unknown[]
    const tipoElemento = tipoCsharpEscalar(escalar)
    const elementos = lista.map((v) => literalCsharp(v, escalar)).join(', ')
    return `new List<${tipoElemento}> { ${elementos} }`
  }
  if (tipo === 'bool') return valor ? 'true' : 'false'
  if (tipo === 'string') return JSON.stringify(valor)
  return String(valor)
}

function lineaImpresion(tipo: TipoDato): string {
  const escalar = tipoEscalarDeLista(tipo)
  if (escalar) {
    if (escalar === 'bool') {
      return '    Console.WriteLine("[" + string.Join(", ", __resultado_juez__.ConvertAll(x => x ? "true" : "false")) + "]");'
    }
    return '    Console.WriteLine("[" + string.Join(", ", __resultado_juez__) + "]");'
  }
  if (tipo === 'bool') return '    Console.WriteLine(__resultado_juez__ ? "true" : "false");'
  return '    Console.WriteLine(__resultado_juez__);'
}

export function generarProgramaCsharp(
  codigoParticipante: string,
  nombreFuncion: string,
  parametros: Parametro[],
  tipoRetorno: TipoDato,
  argumentos: Valor[],
): { archivo: string; contenido: string } {
  const args = argumentos.map((v, i) => literalCsharp(v, parametros[i].tipo)).join(', ')
  const contenido = [
    'using System;',
    'using System.Collections.Generic;',
    '',
    'class Program {',
    codigoParticipante,
    '',
    '  static void Main() {',
    `    var __resultado_juez__ = ${nombreFuncion}(${args});`,
    lineaImpresion(tipoRetorno),
    '  }',
    '}',
  ].join('\n')
  return { archivo: 'main.cs', contenido }
}
```

`Console.WriteLine(bool)` en C# imprime `"True"`/`"False"` capitalizado — por eso el caso especial con el operador ternario, igual que se documentó en el spec.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/harness-csharp.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/judge/harness/csharp.ts tests/harness-csharp.test.ts
git commit -m "feat: agregar generador de driver C#"
```

---

### Task 11: Dispatcher de harness por lenguaje

**Files:**
- Create: `src/server/judge/harness/index.ts`
- Test: `tests/harness-index.test.ts`

**Interfaces:**
- Consumes: `generarProgramaPython` (Task 6), `generarProgramaJavascript` (Task 7), `generarProgramaPhp` (Task 8), `generarProgramaJava` (Task 9), `generarProgramaCsharp` (Task 10).
- Produces: `generarPrograma(lenguaje, codigoParticipante, nombreFuncion, parametros, tipoRetorno, argumentos): { archivo: string; contenido: string }`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { generarPrograma } from '../src/server/judge/harness'

describe('generarPrograma', () => {
  it('despacha al generador correcto por lenguaje', () => {
    const { archivo } = generarPrograma('python', 'def f(x):\n  return x', 'f', [{ nombre: 'x', tipo: 'int' }], 'int', [1])
    expect(archivo).toBe('main.py')
  })

  it('lanza error para un lenguaje no soportado', () => {
    expect(() => generarPrograma('cobol', '', 'f', [], 'int', [])).toThrow('Lenguaje no soportado: cobol')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/harness-index.test.ts`
Expected: FAIL with "Cannot find module '../src/server/judge/harness'"

- [ ] **Step 3: Write implementation**

```ts
import type { Parametro, TipoDato, Valor } from '../tipos'
import { generarProgramaPython } from './python'
import { generarProgramaJavascript } from './javascript'
import { generarProgramaPhp } from './php'
import { generarProgramaJava } from './java'
import { generarProgramaCsharp } from './csharp'

type GeneradorPrograma = (
  codigoParticipante: string,
  nombreFuncion: string,
  parametros: Parametro[],
  tipoRetorno: TipoDato,
  argumentos: Valor[],
) => { archivo: string; contenido: string }

const GENERADORES: Record<string, GeneradorPrograma> = {
  python: generarProgramaPython,
  javascript: generarProgramaJavascript,
  php: generarProgramaPhp,
  java: generarProgramaJava,
  csharp: generarProgramaCsharp,
}

export function generarPrograma(
  lenguaje: string,
  codigoParticipante: string,
  nombreFuncion: string,
  parametros: Parametro[],
  tipoRetorno: TipoDato,
  argumentos: Valor[],
): { archivo: string; contenido: string } {
  const generador = GENERADORES[lenguaje]
  if (!generador) throw new Error(`Lenguaje no soportado: ${lenguaje}`)
  return generador(codigoParticipante, nombreFuncion, parametros, tipoRetorno, argumentos)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/harness-index.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/judge/harness/index.ts tests/harness-index.test.ts
git commit -m "feat: agregar dispatcher de generación de driver por lenguaje"
```

---

### Task 12: `ResultadoCaso` y veredicto con guard de 0 casos

**Files:**
- Modify: `src/server/judge/verdict.ts`
- Test: `tests/judge.test.ts` (reescribir la parte de `determinarVeredicto`, se completa en Task 14)

**Interfaces:**
- Consumes: `Valor` de Task 1.
- Produces: `ResultadoCaso` (con `visible: boolean`, `argumentos: Valor[]`, sin `entrada`), `Veredicto`, `determinarVeredicto(resultados): Veredicto` (con guard para `resultados.length === 0`).

- [ ] **Step 1: Write the failing test**

Crear `tests/judge-verdict.test.ts` (archivo nuevo, separado de `judge.test.ts` que se reescribe en Task 14):

```ts
import { describe, it, expect } from 'vitest'
import { determinarVeredicto } from '../src/server/judge/verdict'

describe('determinarVeredicto', () => {
  it('returns accepted when all cases pass', () => {
    const veredicto = determinarVeredicto([
      { visible: true, argumentos: [1], salidaEsperada: '2', salidaObtenida: '2', aprobado: true, salidaError: '', tiempoExcedido: false, codigoSalida: 0 },
    ])
    expect(veredicto).toBe('aceptado')
  })

  it('returns wrong_answer when a case fails without error', () => {
    const veredicto = determinarVeredicto([
      { visible: true, argumentos: [1], salidaEsperada: '2', salidaObtenida: '3', aprobado: false, salidaError: '', tiempoExcedido: false, codigoSalida: 0 },
    ])
    expect(veredicto).toBe('respuesta_incorrecta')
  })

  it('returns runtime_error when a case has a nonzero exit code', () => {
    const veredicto = determinarVeredicto([
      { visible: true, argumentos: [1], salidaEsperada: '2', salidaObtenida: '', aprobado: false, salidaError: 'Traceback', codigoSalida: 1, tiempoExcedido: false },
    ])
    expect(veredicto).toBe('error_ejecucion')
  })

  it('returns timeout when a case timed out, taking priority over other failures', () => {
    const veredicto = determinarVeredicto([
      { visible: true, argumentos: [1], salidaEsperada: '2', salidaObtenida: '', aprobado: false, salidaError: 'Traceback', tiempoExcedido: true, codigoSalida: 1 },
    ])
    expect(veredicto).toBe('tiempo_excedido')
  })

  it('returns error_ejecucion (not aceptado) when there are zero resultados', () => {
    expect(determinarVeredicto([])).toBe('error_ejecucion')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/judge-verdict.test.ts`
Expected: FAIL (el tipo `ResultadoCaso` actual usa `entrada`, no `argumentos`/`visible`; y `[]` da `aceptado` por vacuidad)

- [ ] **Step 3: Write implementation**

```ts
import type { Valor } from './tipos'

export type ResultadoCaso = {
  visible: boolean
  argumentos: Valor[]
  salidaEsperada: string
  salidaObtenida: string
  aprobado: boolean
  salidaError: string
  tiempoExcedido: boolean
  codigoSalida: number
}

export type Veredicto = 'aceptado' | 'respuesta_incorrecta' | 'error_ejecucion' | 'tiempo_excedido'

export function determinarVeredicto(resultados: ResultadoCaso[]): Veredicto {
  if (resultados.length === 0) return 'error_ejecucion'
  if (resultados.some((r) => r.tiempoExcedido)) return 'tiempo_excedido'
  if (resultados.some((r) => r.codigoSalida !== 0)) return 'error_ejecucion'
  return resultados.every((r) => r.aprobado) ? 'aceptado' : 'respuesta_incorrecta'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/judge-verdict.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/judge/verdict.ts tests/judge-verdict.test.ts
git commit -m "feat: rediseñar ResultadoCaso y blindar determinarVeredicto contra 0 casos"
```

---

### Task 13: Resultado público — ocultar detalle de casos ocultos

**Files:**
- Create: `src/server/judge/resultadoPublico.ts`
- Test: `tests/judge-resultado-publico.test.ts`

**Interfaces:**
- Consumes: `ResultadoCaso` de Task 12.
- Produces: `ResultadoCasoPublico` (union discriminada por `visible`), `ocultarDetalleCasosNoVisibles(resultados: ResultadoCaso[]): ResultadoCasoPublico[]`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { ocultarDetalleCasosNoVisibles } from '../src/server/judge/resultadoPublico'
import type { ResultadoCaso } from '../src/server/judge/verdict'

describe('ocultarDetalleCasosNoVisibles', () => {
  it('conserva el detalle completo de los casos visibles', () => {
    const resultados: ResultadoCaso[] = [
      { visible: true, argumentos: ['hola'], salidaEsperada: '2', salidaObtenida: '2', aprobado: true, salidaError: '', tiempoExcedido: false, codigoSalida: 0 },
    ]
    const publico = ocultarDetalleCasosNoVisibles(resultados)
    expect(publico[0]).toEqual({ visible: true, argumentos: ['hola'], salidaEsperada: '2', salidaObtenida: '2', aprobado: true, salidaError: '' })
  })

  it('oculta argumentos, salidaEsperada y salidaObtenida de los casos ocultos', () => {
    const resultados: ResultadoCaso[] = [
      { visible: false, argumentos: ['secreto'], salidaEsperada: '99', salidaObtenida: '0', aprobado: false, salidaError: '', tiempoExcedido: false, codigoSalida: 0 },
    ]
    const publico = ocultarDetalleCasosNoVisibles(resultados)
    expect(publico[0]).toEqual({ visible: false, aprobado: false })
    expect(JSON.stringify(publico)).not.toContain('secreto')
    expect(JSON.stringify(publico)).not.toContain('99')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/judge-resultado-publico.test.ts`
Expected: FAIL with "Cannot find module '../src/server/judge/resultadoPublico'"

- [ ] **Step 3: Write implementation**

```ts
import type { Valor } from './tipos'
import type { ResultadoCaso } from './verdict'

export type ResultadoCasoPublico =
  | {
      visible: true
      argumentos: Valor[]
      salidaEsperada: string
      salidaObtenida: string
      aprobado: boolean
      salidaError: string
    }
  | { visible: false; aprobado: boolean }

export function ocultarDetalleCasosNoVisibles(resultados: ResultadoCaso[]): ResultadoCasoPublico[] {
  return resultados.map((r) =>
    r.visible
      ? {
          visible: true,
          argumentos: r.argumentos,
          salidaEsperada: r.salidaEsperada,
          salidaObtenida: r.salidaObtenida,
          aprobado: r.aprobado,
          salidaError: r.salidaError,
        }
      : { visible: false, aprobado: r.aprobado },
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/judge-resultado-publico.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/judge/resultadoPublico.ts tests/judge-resultado-publico.test.ts
git commit -m "feat: filtrar detalle de casos ocultos antes de responder al cliente"
```

---

### Task 14: Reescribir `runTestCases.ts`

**Files:**
- Modify: `src/server/judge/runTestCases.ts`
- Modify: `tests/judge.test.ts`

**Interfaces:**
- Consumes: `generarPrograma` (Task 11), `ejecutarPiston` (Task 4), `serializarCanonico` (Task 2), `determinarVeredicto`/`ResultadoCaso` (Task 12), `Parametro`/`TipoDato`/`Valor` (Task 1).
- Produces: `CasoPrueba` (`{ argumentos: Valor[]; salidaEsperada: Valor; visible: boolean }`), `Firma` (`{ nombreFuncion, parametros, tipoRetorno }`), `ejecutarCasosPrueba(lenguaje, codigo, firma, casosPrueba): Promise<{ resultados: ResultadoCaso[]; veredicto: Veredicto }>`.

- [ ] **Step 1: Reescribir `tests/judge.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest'
import { ejecutarCasosPrueba } from '../src/server/judge/runTestCases'
import { ejecutarPiston } from '../src/server/piston/client'

vi.mock('../src/server/piston/client', () => ({
  ejecutarPiston: vi.fn(),
}))

describe('ejecutarCasosPrueba', () => {
  it('genera un programa por caso, compara contra el texto canónico y agrega el veredicto', async () => {
    vi.mocked(ejecutarPiston).mockImplementation(async (_lenguaje, _archivo, contenido) => ({
      salidaEstandar: (contenido as string).includes('"hola"') ? '2' : '5',
      salidaError: '',
      codigoSalida: 0,
      tiempoExcedido: false,
    }))

    const firma = {
      nombreFuncion: 'contar_vocales',
      parametros: [{ nombre: 'texto', tipo: 'string' as const }],
      tipoRetorno: 'int' as const,
    }

    const { resultados, veredicto } = await ejecutarCasosPrueba('python', 'def contar_vocales(texto):\n  return 0', firma, [
      { argumentos: ['hola'], salidaEsperada: 2, visible: true },
      { argumentos: ['mazatenango'], salidaEsperada: 5, visible: false },
    ])

    expect(resultados[0]).toMatchObject({ visible: true, aprobado: true, salidaEsperada: '2', salidaObtenida: '2' })
    expect(resultados[1]).toMatchObject({ visible: false, aprobado: true, salidaEsperada: '5', salidaObtenida: '5' })
    expect(veredicto).toBe('aceptado')
  })

  it('marca respuesta_incorrecta si algún caso no coincide', async () => {
    vi.mocked(ejecutarPiston).mockResolvedValue({
      salidaEstandar: '0',
      salidaError: '',
      codigoSalida: 0,
      tiempoExcedido: false,
    })

    const firma = {
      nombreFuncion: 'f',
      parametros: [{ nombre: 'x', tipo: 'int' as const }],
      tipoRetorno: 'int' as const,
    }

    const { veredicto } = await ejecutarCasosPrueba('python', 'def f(x):\n  return 0', firma, [
      { argumentos: [1], salidaEsperada: 1, visible: true },
    ])
    expect(veredicto).toBe('respuesta_incorrecta')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/judge.test.ts`
Expected: FAIL (`ejecutarCasosPrueba` todavía tiene la firma vieja basada en `entrada`/stdin)

- [ ] **Step 3: Write implementation**

```ts
import { generarPrograma } from './harness'
import { serializarCanonico } from './serializar'
import { ejecutarPiston } from '../piston/client'
import { determinarVeredicto } from './verdict'
import type { ResultadoCaso, Veredicto } from './verdict'
import type { Parametro, TipoDato, Valor } from './tipos'

export type CasoPrueba = { argumentos: Valor[]; salidaEsperada: Valor; visible: boolean }

export type Firma = {
  nombreFuncion: string
  parametros: Parametro[]
  tipoRetorno: TipoDato
}

export async function ejecutarCasosPrueba(
  lenguaje: string,
  codigo: string,
  firma: Firma,
  casosPrueba: CasoPrueba[],
): Promise<{ resultados: ResultadoCaso[]; veredicto: Veredicto }> {
  const resultados: ResultadoCaso[] = []

  for (const casoPrueba of casosPrueba) {
    const { archivo, contenido } = generarPrograma(
      lenguaje,
      codigo,
      firma.nombreFuncion,
      firma.parametros,
      firma.tipoRetorno,
      casoPrueba.argumentos,
    )
    const salida = await ejecutarPiston(lenguaje, archivo, contenido)
    const salidaObtenida = salida.salidaEstandar.trim()
    const salidaEsperadaTexto = serializarCanonico(casoPrueba.salidaEsperada, firma.tipoRetorno)
    resultados.push({
      visible: casoPrueba.visible,
      argumentos: casoPrueba.argumentos,
      salidaEsperada: salidaEsperadaTexto,
      salidaObtenida,
      aprobado: salidaObtenida === salidaEsperadaTexto,
      salidaError: salida.salidaError,
      tiempoExcedido: salida.tiempoExcedido,
      codigoSalida: salida.codigoSalida,
    })
  }

  return { resultados, veredicto: determinarVeredicto(resultados) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/judge.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/judge/runTestCases.ts tests/judge.test.ts
git commit -m "feat: reescribir ejecutarCasosPrueba sobre el motor de funciones"
```

---

### Task 15: Validación de problema

**Files:**
- Modify: `src/server/problems/validate.ts`
- Modify: `tests/problems-validate.test.ts`

**Interfaces:**
- Consumes: `Parametro`, `TipoDato`, `valorCoincideConTipo` de Task 1.
- Produces: `LenguajeProblema`, `CasoPruebaProblema`, `validarDatosProblema(input): string[]` con las reglas del spec (tipos, mínimo 4 casos, diversidad, al menos 1 visible y 1 oculto, nombreFuncion/codigoInicial por lenguaje).

- [ ] **Step 1: Reescribir `tests/problems-validate.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { validarDatosProblema } from '../src/server/problems/validate'

function problemaBase() {
  return {
    titulo: 'Contar vocales',
    descripcion: 'desc',
    grupo: 'invitado_junior' as const,
    puntos: 10,
    parametros: [{ nombre: 'texto', tipo: 'string' as const }],
    tipoRetorno: 'int' as const,
    lenguajes: [{ lenguaje: 'python', nombreFuncion: 'contar_vocales', codigoInicial: 'def contar_vocales(texto):\n  pass' }],
    casosPrueba: [
      { argumentos: ['hola'], salidaEsperada: 2, visible: true },
      { argumentos: ['mazatenango'], salidaEsperada: 5, visible: true },
      { argumentos: ['xyz'], salidaEsperada: 0, visible: true },
      { argumentos: ['seminario'], salidaEsperada: 4, visible: false },
    ],
  }
}

describe('validarDatosProblema', () => {
  it('passes for a fully filled problem', () => {
    expect(validarDatosProblema(problemaBase())).toEqual([])
  })

  it('reports missing title, description, and languages', () => {
    const errores = validarDatosProblema({ ...problemaBase(), titulo: '  ', descripcion: '', lenguajes: [] })
    expect(errores).toContain('El título es requerido')
    expect(errores).toContain('La descripción es requerida')
    expect(errores).toContain('Debe permitir al menos un lenguaje')
  })

  it('reporta cuando falta un grupo válido', () => {
    const errores = validarDatosProblema({ ...problemaBase(), grupo: '' as never })
    expect(errores).toContain('Debe indicar el grupo (invitado_junior o senior)')
  })

  it('reporta cuando falta el nombre de función o el código inicial de un lenguaje', () => {
    const errores = validarDatosProblema({
      ...problemaBase(),
      lenguajes: [{ lenguaje: 'python', nombreFuncion: '', codigoInicial: '' }],
    })
    expect(errores).toContain('Falta el nombre de función para python')
    expect(errores).toContain('Falta el código inicial para python')
  })

  it('reporta menos de 4 casos de prueba', () => {
    const errores = validarDatosProblema({ ...problemaBase(), casosPrueba: problemaBase().casosPrueba.slice(0, 2) })
    expect(errores).toContain('Debe haber al menos 4 casos de prueba')
  })

  it('reporta cuando todas las salidas esperadas son iguales', () => {
    const errores = validarDatosProblema({
      ...problemaBase(),
      casosPrueba: problemaBase().casosPrueba.map((c) => ({ ...c, salidaEsperada: 0 })),
    })
    expect(errores).toContain('Todos los casos de prueba tienen la misma salida esperada — agrega variedad')
  })

  it('reporta cuando no hay ningún caso visible', () => {
    const errores = validarDatosProblema({
      ...problemaBase(),
      casosPrueba: problemaBase().casosPrueba.map((c) => ({ ...c, visible: false })),
    })
    expect(errores).toContain('Debe haber al menos un caso de prueba visible')
  })

  it('reporta cuando no hay ningún caso oculto', () => {
    const errores = validarDatosProblema({
      ...problemaBase(),
      casosPrueba: problemaBase().casosPrueba.map((c) => ({ ...c, visible: true })),
    })
    expect(errores).toContain('Debe haber al menos un caso de prueba oculto')
  })

  it('reporta un argumento de tipo incorrecto', () => {
    const errores = validarDatosProblema({
      ...problemaBase(),
      casosPrueba: [
        { argumentos: [123], salidaEsperada: 2, visible: true },
        ...problemaBase().casosPrueba.slice(1),
      ],
    })
    expect(errores).toContain('El caso 1 tiene un argumento de tipo incorrecto')
  })

  it('reporta puntos inválidos', () => {
    const errores = validarDatosProblema({ ...problemaBase(), puntos: 0 })
    expect(errores).toContain('Los puntos deben ser un entero positivo')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/problems-validate.test.ts`
Expected: FAIL (la firma actual de `validarDatosProblema` usa `lenguajesPermitidos`, sin `parametros`/`casosPrueba`/`puntos`)

- [ ] **Step 3: Write implementation**

```ts
import { valorCoincideConTipo } from '../judge/tipos'
import type { Parametro, TipoDato } from '../judge/tipos'

export type LenguajeProblema = { lenguaje: string; nombreFuncion: string; codigoInicial: string }
export type CasoPruebaProblema = { argumentos: unknown[]; salidaEsperada: unknown; visible: boolean }

export function validarDatosProblema(input: {
  titulo: string
  descripcion: string
  grupo: 'invitado_junior' | 'senior'
  puntos: number
  parametros: Parametro[]
  tipoRetorno: TipoDato
  lenguajes: LenguajeProblema[]
  casosPrueba: CasoPruebaProblema[]
}) {
  const errores: string[] = []
  if (!input.titulo.trim()) errores.push('El título es requerido')
  if (!input.descripcion.trim()) errores.push('La descripción es requerida')
  if (input.grupo !== 'invitado_junior' && input.grupo !== 'senior')
    errores.push('Debe indicar el grupo (invitado_junior o senior)')
  if (!Number.isInteger(input.puntos) || input.puntos <= 0)
    errores.push('Los puntos deben ser un entero positivo')

  if (input.lenguajes.length === 0) errores.push('Debe permitir al menos un lenguaje')
  for (const lenguaje of input.lenguajes) {
    if (!lenguaje.nombreFuncion.trim()) errores.push(`Falta el nombre de función para ${lenguaje.lenguaje}`)
    if (!lenguaje.codigoInicial.trim()) errores.push(`Falta el código inicial para ${lenguaje.lenguaje}`)
  }

  if (input.casosPrueba.length < 4) errores.push('Debe haber al menos 4 casos de prueba')

  for (const [i, caso] of input.casosPrueba.entries()) {
    if (caso.argumentos.length !== input.parametros.length) {
      errores.push(`El caso ${i + 1} no tiene la cantidad correcta de argumentos`)
      continue
    }
    const argumentosValidos = caso.argumentos.every((valor, j) =>
      valorCoincideConTipo(valor, input.parametros[j].tipo),
    )
    if (!argumentosValidos) errores.push(`El caso ${i + 1} tiene un argumento de tipo incorrecto`)
    if (!valorCoincideConTipo(caso.salidaEsperada, input.tipoRetorno)) {
      errores.push(`El caso ${i + 1} tiene una salida esperada de tipo incorrecto`)
    }
  }

  if (input.casosPrueba.length > 0) {
    const salidasUnicas = new Set(input.casosPrueba.map((c) => JSON.stringify(c.salidaEsperada)))
    if (salidasUnicas.size === 1) {
      errores.push('Todos los casos de prueba tienen la misma salida esperada — agrega variedad')
    }
    if (!input.casosPrueba.some((c) => c.visible)) {
      errores.push('Debe haber al menos un caso de prueba visible')
    }
    if (!input.casosPrueba.some((c) => !c.visible)) {
      errores.push('Debe haber al menos un caso de prueba oculto')
    }
  }

  return errores
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/problems-validate.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/problems/validate.ts tests/problems-validate.test.ts
git commit -m "feat: validar tipos, mínimos y casos ocultos al guardar un problema"
```

---

### Task 16: Server functions de problemas (CRUD)

**Files:**
- Modify: `src/server/functions/problems.ts`

**Interfaces:**
- Consumes: schema de Task 3, `validarDatosProblema`/`LenguajeProblema`/`CasoPruebaProblema` de Task 15.
- Produces: `DatosProblema` (nuevo shape), `crearProblema`, `actualizarProblema` (insertan/actualizan `problemaLenguajes` y `casosPrueba` con el nuevo formato), `obtenerProblema` (devuelve también `lenguajes`), `listarProblemas`/`eliminarProblema` sin cambios de lógica.

- [ ] **Step 1: Reescribir `problems.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { problemas, casosPrueba, problemaLenguajes } from '../db/schema'
import { requerirAdmin, requerirParticipanteIngresado } from '../auth/middleware'
import { validarDatosProblema } from '../problems/validate'
import { grupoDeCategoria } from '../problems/grupo'
import type { Parametro, TipoDato, Valor } from '../judge/tipos'

type DatosProblema = {
  titulo: string
  descripcion: string
  dificultad: string
  orden: number
  grupo: 'invitado_junior' | 'senior'
  puntos: number
  parametros: Parametro[]
  tipoRetorno: TipoDato
  lenguajes: { lenguaje: string; nombreFuncion: string; codigoInicial: string }[]
  casosPrueba: { argumentos: Valor[]; salidaEsperada: Valor; visible: boolean }[]
}

export const listarProblemas = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const user = await requerirParticipanteIngresado(request.headers)
  if (user.rol === 'admin') {
    return db.select().from(problemas).orderBy(problemas.orden)
  }
  const grupo = grupoDeCategoria(user.categoria as 'invitado' | 'junior' | 'senior')
  return db.select().from(problemas).where(eq(problemas.grupo, grupo)).orderBy(problemas.orden)
})

export const obtenerProblema = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const request = getRequest()
    const user = await requerirParticipanteIngresado(request.headers)
    const rows = await db.select().from(problemas).where(eq(problemas.id, data))
    const filaProblema = rows.length > 0 ? rows[0] : null
    const puedeVerlo =
      user.rol === 'admin' ||
      filaProblema?.grupo === grupoDeCategoria(user.categoria as 'invitado' | 'junior' | 'senior')
    const problema = filaProblema && puedeVerlo ? filaProblema : null
    const casos = problema
      ? await db.select().from(casosPrueba).where(eq(casosPrueba.problemaId, data))
      : []
    const lenguajes = problema
      ? await db.select().from(problemaLenguajes).where(eq(problemaLenguajes.problemaId, data))
      : []
    return { problema, casosPrueba: casos, lenguajes }
  })

export const crearProblema = createServerFn({ method: 'POST' })
  .validator((input: DatosProblema) => input)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const errores = validarDatosProblema(data)
    if (errores.length > 0) throw new Error(errores.join(', '))

    const id = crypto.randomUUID()
    await db.insert(problemas).values({
      id,
      titulo: data.titulo,
      descripcion: data.descripcion,
      dificultad: data.dificultad,
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
          lenguaje: l.lenguaje as 'python' | 'javascript' | 'java' | 'csharp' | 'php',
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
  .validator((input: DatosProblema & { id: string }) => input)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const errores = validarDatosProblema(data)
    if (errores.length > 0) throw new Error(errores.join(', '))

    await db
      .update(problemas)
      .set({
        titulo: data.titulo,
        descripcion: data.descripcion,
        dificultad: data.dificultad,
        orden: data.orden,
        grupo: data.grupo,
        puntos: data.puntos,
        parametros: data.parametros,
        tipoRetorno: data.tipoRetorno,
      })
      .where(eq(problemas.id, data.id))

    await db.delete(problemaLenguajes).where(eq(problemaLenguajes.problemaId, data.id))
    if (data.lenguajes.length > 0) {
      await db.insert(problemaLenguajes).values(
        data.lenguajes.map((l) => ({
          problemaId: data.id,
          lenguaje: l.lenguaje as 'python' | 'javascript' | 'java' | 'csharp' | 'php',
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
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)
    await db.delete(problemas).where(eq(problemas.id, data))
  })
```

- [ ] **Step 2: Verificar tipos y pruebas relacionadas**

Run: `npx tsc --noEmit` y `npx vitest run tests/db.test.ts`
Expected: sin errores de tipos nuevos originados en este archivo; `db.test.ts` sigue en PASS (no ejercita `problems.ts` directamente, pero comparte el schema).

- [ ] **Step 3: Commit**

```bash
git add src/server/functions/problems.ts
git commit -m "feat: adaptar CRUD de problemas al modelo de función tipada"
```

---

### Task 17: Server functions Run y Submit

**Files:**
- Modify: `src/server/functions/run.ts`
- Modify: `src/server/functions/submit.ts`

**Interfaces:**
- Consumes: `problemaLenguajes` (Task 3), `ejecutarCasosPrueba`/`Firma`/`CasoPrueba` (Task 14), `ocultarDetalleCasosNoVisibles`/`ResultadoCasoPublico` (Task 13).
- Produces: `ejecutarCodigo`/`enviarCodigo` devuelven `resultados: ResultadoCasoPublico[]` — corren siempre contra todos los casos, y el servidor nunca manda detalle de los ocultos.

- [ ] **Step 1: Reescribir `run.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { problemas, casosPrueba, problemaLenguajes, corridas } from '../db/schema'
import { requerirParticipanteIngresado } from '../auth/middleware'
import { ejecutarCasosPrueba } from '../judge/runTestCases'
import { ocultarDetalleCasosNoVisibles } from '../judge/resultadoPublico'
import { debeMostrarHint } from '../judge/hintCadence'
import { generarComentarioEnvio } from '../claude/feedback'
import type { ResultadoCasoPublico } from '../judge/resultadoPublico'

export const ejecutarCodigo = createServerFn({ method: 'POST' })
  .validator((input: { problemaId: string; lenguaje: string; codigo: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<{ resultados: ResultadoCasoPublico[]; error: string | null; hint: string | null }> => {
      const request = getRequest()
      const user = await requerirParticipanteIngresado(request.headers)

      const rows = await db.select().from(problemas).where(eq(problemas.id, data.problemaId))
      const problema = rows.length > 0 ? rows[0] : null
      if (!problema) throw new Error('Problema no encontrado')

      const filasLenguaje = await db
        .select()
        .from(problemaLenguajes)
        .where(and(eq(problemaLenguajes.problemaId, data.problemaId), eq(problemaLenguajes.lenguaje, data.lenguaje as 'python' | 'javascript' | 'java' | 'csharp' | 'php')))
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

        let hint: string | null = null
        if (user.categoria === 'invitado') {
          try {
            await db
              .insert(corridas)
              .values({ usuarioId: user.id, problemaId: data.problemaId, contador: 1 })
              .onDuplicateKeyUpdate({ set: { contador: sql`${corridas.contador} + 1` } })
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

`resultados.find((r) => r.visible && r.salidaError)` usa el `ResultadoCaso` completo (interno, no el público) para construir el hint — está bien que el prompt de Claude vea el detalle de un caso oculto, porque ese texto nunca vuelve al cliente tal cual, solo se usa para generar una pista.

- [ ] **Step 2: Reescribir `submit.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { problemas, casosPrueba, problemaLenguajes, envios, estadoTorneo } from '../db/schema'
import { requerirParticipanteIngresado } from '../auth/middleware'
import { ejecutarCasosPrueba } from '../judge/runTestCases'
import { ocultarDetalleCasosNoVisibles } from '../judge/resultadoPublico'
import { generarComentarioEnvio } from '../claude/feedback'
import { asegurarIniciado } from '../tournament/guard'
import type { ResultadoCasoPublico } from '../judge/resultadoPublico'

export const enviarCodigo = createServerFn({ method: 'POST' })
  .validator((input: { problemaId: string; lenguaje: string; codigo: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<{ envioId: string; veredicto: string | null; resultados: ResultadoCasoPublico[]; error: string | null }> => {
      const request = getRequest()
      const user = await requerirParticipanteIngresado(request.headers)

      const filasEstado = await db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))
      const estado = filasEstado.length > 0 ? filasEstado[0] : null
      asegurarIniciado(estado ?? { iniciadoEn: null })

      const filasProblema = await db.select().from(problemas).where(eq(problemas.id, data.problemaId))
      const problema = filasProblema.length > 0 ? filasProblema[0] : null
      if (!problema) throw new Error('Problema no encontrado')

      const filasLenguaje = await db
        .select()
        .from(problemaLenguajes)
        .where(and(eq(problemaLenguajes.problemaId, data.problemaId), eq(problemaLenguajes.lenguaje, data.lenguaje as 'python' | 'javascript' | 'java' | 'csharp' | 'php')))
      const filaLenguaje = filasLenguaje.length > 0 ? filasLenguaje[0] : null
      if (!filaLenguaje) throw new Error('Lenguaje no habilitado para este problema')

      const casos = await db.select().from(casosPrueba).where(eq(casosPrueba.problemaId, data.problemaId))

      const envioId = crypto.randomUUID()
      await db.insert(envios).values({
        id: envioId,
        usuarioId: user.id,
        problemaId: data.problemaId,
        codigo: data.codigo,
        lenguaje: data.lenguaje,
        estado: 'pendiente',
      })

      try {
        const { resultados, veredicto } = await ejecutarCasosPrueba(
          data.lenguaje,
          data.codigo,
          { nombreFuncion: filaLenguaje.nombreFuncion, parametros: problema.parametros, tipoRetorno: problema.tipoRetorno },
          casos.map((c) => ({ argumentos: c.argumentos, salidaEsperada: c.salidaEsperada, visible: c.visible })),
        )
        const salidaError = resultados.find((r) => r.visible && r.salidaError)?.salidaError ?? ''

        await db.update(envios).set({ estado: veredicto }).where(eq(envios.id, envioId))

        if (user.categoria === 'invitado') {
          generarComentarioEnvio({
            tituloProblema: problema.titulo,
            descripcionProblema: problema.descripcion,
            codigo: data.codigo,
            veredicto,
            salidaError,
          })
            .then((comentario) => db.update(envios).set({ comentarioClaude: comentario }).where(eq(envios.id, envioId)))
            .catch((err: unknown) => console.error('Comentario de Claude falló', err))
        }

        return { envioId, veredicto, resultados: ocultarDetalleCasosNoVisibles(resultados), error: null }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return {
          envioId,
          veredicto: null,
          resultados: [],
          error: `No se pudo evaluar el envío. Intenta de nuevo. (${message})`,
        }
      }
    },
  )

export const obtenerEnvio = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirParticipanteIngresado(request.headers)
    const rows = await db.select().from(envios).where(eq(envios.id, data))
    return rows.length > 0 ? rows[0] : null
  })
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores originados en `run.ts`/`submit.ts` (los errores en `routes/problemas/$problemaId.tsx`/`RunResults.tsx` se resuelven en Tasks 18-20).

- [ ] **Step 4: Commit**

```bash
git add src/server/functions/run.ts src/server/functions/submit.ts
git commit -m "feat: correr Run/Submit siempre contra todos los casos y ocultar detalle de los ocultos"
```

---

### Task 18: Panel de admin — formulario de problema

**Files:**
- Modify: `src/components/AdminProblemForm.tsx`
- Modify: `src/routes/admin/problemas/$problemaId.tsx`

**Interfaces:**
- Consumes: `Parametro`/`TipoDato` (Task 1), `LenguajeProblema`/`CasoPruebaProblema` (Task 15), `obtenerProblema`/`crearProblema`/`actualizarProblema` (Task 16).
- Produces: `ValorFormularioProblema`, `DatosProblemaEnviado`, `AdminProblemForm` con parámetros tipados, puntos, casos de prueba con JSON por argumento, checkbox `visible`, y starter code + nombre de función por lenguaje.

- [ ] **Step 1: Reescribir `AdminProblemForm.tsx`**

```tsx
import { useState } from 'react'

export type TipoDatoFormulario =
  | 'int' | 'float' | 'bool' | 'string' | 'list<int>' | 'list<float>' | 'list<bool>' | 'list<string>'

const TIPOS_DATO: TipoDatoFormulario[] = [
  'int', 'float', 'bool', 'string', 'list<int>', 'list<float>', 'list<bool>', 'list<string>',
]

const LENGUAJES_DISPONIBLES = ['python', 'javascript', 'java', 'csharp', 'php']

export type ParametroFormulario = { nombre: string; tipo: TipoDatoFormulario }
export type LenguajeFormulario = { lenguaje: string; nombreFuncion: string; codigoInicial: string }
export type CasoPruebaFormulario = { argumentosTexto: string[]; salidaEsperadaTexto: string; visible: boolean }

export type ValorFormularioProblema = {
  titulo: string
  descripcion: string
  dificultad: string
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
  dificultad: string
  orden: number
  grupo: 'invitado_junior' | 'senior'
  puntos: number
  parametros: ParametroFormulario[]
  tipoRetorno: TipoDatoFormulario
  lenguajes: LenguajeFormulario[]
  casosPrueba: { argumentos: unknown[]; salidaEsperada: unknown; visible: boolean }[]
}

export function AdminProblemForm({
  initial,
  onSubmit,
}: {
  initial: ValorFormularioProblema
  onSubmit: (value: DatosProblemaEnviado) => void
}) {
  const [value, setValue] = useState(initial)
  const [errorParseo, setErrorParseo] = useState<string | null>(null)

  function actualizarParametro(index: number, campo: 'nombre' | 'tipo', texto: string) {
    const next = value.parametros.slice()
    next[index] = { ...next[index], [campo]: texto } as ParametroFormulario
    setValue({ ...value, parametros: next })
  }

  function agregarParametro() {
    setValue({ ...value, parametros: [...value.parametros, { nombre: '', tipo: 'int' }] })
  }

  function actualizarLenguaje(index: number, campo: 'nombreFuncion' | 'codigoInicial', texto: string) {
    const next = value.lenguajes.slice()
    next[index] = { ...next[index], [campo]: texto }
    setValue({ ...value, lenguajes: next })
  }

  function alternarLenguaje(lenguaje: string) {
    const existe = value.lenguajes.some((l) => l.lenguaje === lenguaje)
    if (existe) {
      setValue({ ...value, lenguajes: value.lenguajes.filter((l) => l.lenguaje !== lenguaje) })
    } else {
      setValue({ ...value, lenguajes: [...value.lenguajes, { lenguaje, nombreFuncion: '', codigoInicial: '' }] })
    }
  }

  function actualizarCasoPrueba(index: number, campo: 'salidaEsperadaTexto' | 'visible', valorCampo: string | boolean) {
    const next = value.casosPrueba.slice()
    next[index] = { ...next[index], [campo]: valorCampo } as CasoPruebaFormulario
    setValue({ ...value, casosPrueba: next })
  }

  function actualizarArgumento(indexCaso: number, indexArgumento: number, texto: string) {
    const next = value.casosPrueba.slice()
    const argumentos = next[indexCaso].argumentosTexto.slice()
    argumentos[indexArgumento] = texto
    next[indexCaso] = { ...next[indexCaso], argumentosTexto: argumentos }
    setValue({ ...value, casosPrueba: next })
  }

  function agregarCasoPrueba() {
    setValue({
      ...value,
      casosPrueba: [
        ...value.casosPrueba,
        { argumentosTexto: value.parametros.map(() => ''), salidaEsperadaTexto: '', visible: true },
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
      setErrorParseo(null)
      onSubmit({ ...value, casosPrueba })
    } catch {
      setErrorParseo(
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
      <input className="border p-2" placeholder="Título" value={value.titulo}
        onChange={(e) => setValue({ ...value, titulo: e.target.value })} />
      <textarea className="border p-2" placeholder="Descripción (markdown)" value={value.descripcion}
        onChange={(e) => setValue({ ...value, descripcion: e.target.value })} />
      <input className="border p-2" placeholder="Dificultad (easy/medium/hard)" value={value.dificultad}
        onChange={(e) => setValue({ ...value, dificultad: e.target.value })} />
      <input className="border p-2" type="number" placeholder="Puntos" value={value.puntos}
        onChange={(e) => setValue({ ...value, puntos: Number(e.target.value) })} />
      <label>
        Grupo:
        <select className="ml-2 border p-2" value={value.grupo}
          onChange={(e) => setValue({ ...value, grupo: e.target.value as ValorFormularioProblema['grupo'] })}>
          <option value="invitado_junior">Invitados + Junior</option>
          <option value="senior">Senior</option>
        </select>
      </label>

      <h3 className="font-bold">Parámetros de la función</h3>
      {value.parametros.map((p, i) => (
        <div key={i} className="flex gap-2">
          <input className="border p-2" placeholder="nombre" value={p.nombre}
            onChange={(e) => actualizarParametro(i, 'nombre', e.target.value)} />
          <select className="border p-2" value={p.tipo}
            onChange={(e) => actualizarParametro(i, 'tipo', e.target.value)}>
            {TIPOS_DATO.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      ))}
      <button type="button" className="rounded bg-gray-200 px-4 py-2" onClick={agregarParametro}>
        + Agregar parámetro
      </button>

      <label>
        Tipo de retorno:
        <select className="ml-2 border p-2" value={value.tipoRetorno}
          onChange={(e) => setValue({ ...value, tipoRetorno: e.target.value as TipoDatoFormulario })}>
          {TIPOS_DATO.map((t) => (
            <option key={t} value={t}>{t}</option>
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
              <input type="checkbox" checked={!!config} onChange={() => alternarLenguaje(lenguaje)} />
              <span className="ml-2">{lenguaje}</span>
            </label>
            {config && (
              <div className="mt-2 flex flex-col gap-2">
                <input className="border p-2" placeholder="Nombre de la función" value={config.nombreFuncion}
                  onChange={(e) => actualizarLenguaje(index, 'nombreFuncion', e.target.value)} />
                <textarea className="border p-2 font-mono" placeholder="Código inicial" value={config.codigoInicial}
                  onChange={(e) => actualizarLenguaje(index, 'codigoInicial', e.target.value)} />
              </div>
            )}
          </div>
        )
      })}

      <h3 className="font-bold">Casos de prueba</h3>
      {value.casosPrueba.map((caso, i) => (
        <div key={i} className="flex flex-col gap-2 border p-2">
          {value.parametros.map((p, j) => (
            <input key={j} className="border p-2" placeholder={`${p.nombre} (JSON)`} value={caso.argumentosTexto[j] ?? ''}
              onChange={(e) => actualizarArgumento(i, j, e.target.value)} />
          ))}
          <input className="border p-2" placeholder="Salida esperada (JSON)" value={caso.salidaEsperadaTexto}
            onChange={(e) => actualizarCasoPrueba(i, 'salidaEsperadaTexto', e.target.value)} />
          <label>
            <input type="checkbox" checked={caso.visible}
              onChange={(e) => actualizarCasoPrueba(i, 'visible', e.target.checked)} />
            <span className="ml-2">Visible para el participante</span>
          </label>
        </div>
      ))}
      <button type="button" className="rounded bg-gray-200 px-4 py-2" onClick={agregarCasoPrueba}>
        + Agregar caso de prueba
      </button>

      {errorParseo && <p className="text-red-600">{errorParseo}</p>}
      <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Guardar</button>
    </form>
  )
}
```

- [ ] **Step 2: Reescribir `routes/admin/problemas/$problemaId.tsx`**

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { obtenerProblema, crearProblema, actualizarProblema } from '#/server/functions/problems'
import { AdminProblemForm } from '#/components/AdminProblemForm'
import type { ValorFormularioProblema, DatosProblemaEnviado, TipoDatoFormulario } from '#/components/AdminProblemForm'

export const Route = createFileRoute('/admin/problemas/$problemaId')({
  loader: async ({ params }) => {
    if (params.problemaId === 'new') return null
    return obtenerProblema({ data: params.problemaId })
  },
  component: AdminProblemEditPage,
})

function AdminProblemEditPage() {
  const { problemaId } = Route.useParams()
  const data = Route.useLoaderData()
  const navigate = useNavigate()

  if (problemaId !== 'new' && !data?.problema) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold">Problema no encontrado</h1>
        <p className="text-red-600">No existe un problema con el id "{problemaId}".</p>
      </div>
    )
  }

  const initial: ValorFormularioProblema =
    data && data.problema
      ? {
          titulo: data.problema.titulo,
          descripcion: data.problema.descripcion,
          dificultad: data.problema.dificultad,
          orden: data.problema.orden,
          grupo: data.problema.grupo,
          puntos: data.problema.puntos,
          parametros: data.problema.parametros as ValorFormularioProblema['parametros'],
          tipoRetorno: data.problema.tipoRetorno as TipoDatoFormulario,
          lenguajes: data.lenguajes.map((l) => ({
            lenguaje: l.lenguaje,
            nombreFuncion: l.nombreFuncion,
            codigoInicial: l.codigoInicial,
          })),
          casosPrueba: data.casosPrueba.map((cp) => ({
            argumentosTexto: (cp.argumentos as unknown[]).map((a) => JSON.stringify(a)),
            salidaEsperadaTexto: JSON.stringify(cp.salidaEsperada),
            visible: cp.visible,
          })),
        }
      : {
          titulo: '',
          descripcion: '',
          dificultad: 'easy',
          orden: 0,
          grupo: 'invitado_junior',
          puntos: 10,
          parametros: [],
          tipoRetorno: 'int',
          lenguajes: [],
          casosPrueba: [],
        }

  async function handleSubmit(value: DatosProblemaEnviado) {
    if (problemaId === 'new') {
      await crearProblema({ data: value })
    } else {
      await actualizarProblema({ data: { ...value, id: problemaId } })
    }
    await navigate({ to: '/admin/problemas' })
  }

  return <AdminProblemForm initial={initial} onSubmit={handleSubmit} />
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores originados en estos dos archivos.

- [ ] **Step 4: Commit**

```bash
git add src/components/AdminProblemForm.tsx src/routes/admin/problemas/\$problemaId.tsx
git commit -m "feat: rediseñar el formulario de admin para parámetros tipados y casos ocultos"
```

---

### Task 19: Editor de código — nuevos lenguajes

**Files:**
- Modify: `src/components/CodeEditor.tsx`

**Interfaces:**
- Produces: `CodeEditor` con mapeo de Monaco para `java`, `csharp`, `php` además de `python`/`javascript`.

- [ ] **Step 1: Actualizar el mapeo de lenguajes**

```tsx
import Editor from '@monaco-editor/react'

const MONACO_LANGUAGE: Record<string, string> = {
  python: 'python',
  javascript: 'javascript',
  java: 'java',
  csharp: 'csharp',
  php: 'php',
}

export function CodeEditor({
  lenguaje,
  value,
  onChange,
}: {
  lenguaje: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Editor
      height="70vh"
      language={MONACO_LANGUAGE[lenguaje] ?? 'plaintext'}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      theme="vs-dark"
      options={{ minimap: { enabled: false }, fontSize: 14 }}
    />
  )
}
```

Monaco Editor trae soporte incorporado para `java`, `csharp` y `php` como identificadores de lenguaje — no requiere paquetes adicionales.

- [ ] **Step 2: Commit**

```bash
git add src/components/CodeEditor.tsx
git commit -m "feat: soportar resaltado de Java, C# y PHP en el editor"
```

---

### Task 20: Página de problema — ejemplos, reset de lenguaje y resultados

**Files:**
- Modify: `src/components/ProblemDescription.tsx`
- Modify: `src/components/RunResults.tsx`
- Modify: `src/components/SubmitResult.tsx`
- Modify: `src/routes/problemas/$problemaId.tsx`

**Interfaces:**
- Consumes: `serializarCanonico` (Task 2), `ResultadoCasoPublico` (Task 13), `obtenerProblema`/`ejecutarCodigo`/`enviarCodigo` (Tasks 16-17).
- Produces: tabla de ejemplos autogenerada, reset de `codigo` al `codigoInicial` del lenguaje al cambiar de `<select>`, detalle de resultados solo para casos visibles + resumen agregado de ocultos.

- [ ] **Step 1: Actualizar `ProblemDescription.tsx`**

```tsx
export function ProblemDescription({
  titulo,
  descripcion,
  dificultad,
  ejemplos,
}: {
  titulo: string
  descripcion: string
  dificultad: string
  ejemplos: { argumentos: unknown[]; salidaEsperadaTexto: string }[]
}) {
  return (
    <div className="h-[70vh] overflow-y-auto p-4">
      <h1 className="text-xl font-bold">{titulo}</h1>
      <span className="text-sm uppercase text-gray-500">{dificultad}</span>
      <div className="prose mt-4 whitespace-pre-wrap">{descripcion}</div>
      {ejemplos.length > 0 && (
        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 text-left">Input</th>
              <th className="border p-2 text-left">Output</th>
            </tr>
          </thead>
          <tbody>
            {ejemplos.map((ej, i) => (
              <tr key={i}>
                <td className="border p-2">
                  <code>{ej.argumentos.map((a) => JSON.stringify(a)).join(', ')}</code>
                </td>
                <td className="border p-2">
                  <code>{ej.salidaEsperadaTexto}</code>
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

- [ ] **Step 2: Actualizar `RunResults.tsx`**

```tsx
import type { ResultadoCasoPublico } from '#/server/judge/resultadoPublico'

export function RunResults({
  results,
  hint,
}: {
  results: ResultadoCasoPublico[]
  hint: string | null
}) {
  const visibles = results.filter((r) => r.visible)
  const ocultos = results.filter((r) => !r.visible)
  const ocultosAprobados = ocultos.every((r) => r.aprobado)

  return (
    <div className="mt-4">
      <ul className="flex flex-col gap-2">
        {visibles.map((r, i) => (
          <li key={i} className={r.aprobado ? 'text-green-600' : 'text-red-600'}>
            {r.aprobado ? '✅' : '❌'} Input: <code>{r.argumentos.map((a) => JSON.stringify(a)).join(', ')}</code> —
            Esperado: <code>{r.salidaEsperada}</code> — Obtenido: <code>{r.salidaObtenida || r.salidaError}</code>
          </li>
        ))}
        {ocultos.length > 0 && (
          <li className={ocultosAprobados ? 'text-green-600' : 'text-red-600'}>
            {ocultosAprobados ? '✅' : '❌'} {ocultos.length} caso{ocultos.length > 1 ? 's' : ''} oculto
            {ocultos.length > 1 ? 's' : ''}
          </li>
        )}
      </ul>
      {hint && <p className="mt-2 rounded bg-purple-50 p-2 text-sm text-purple-800">💡 {hint}</p>}
    </div>
  )
}
```

`SubmitResult.tsx` no necesita cambios de código — ya recibe `veredicto`/`envioId` como antes, no muestra el detalle de `resultados` (eso vive en `RunResults`, reusado por la ruta si se decide mostrar detalle también en Submit — ver Step 4).

- [ ] **Step 3: Actualizar `routes/problemas/$problemaId.tsx`**

```tsx
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { obtenerProblema } from '#/server/functions/problems'
import { ejecutarCodigo } from '#/server/functions/run'
import { enviarCodigo } from '#/server/functions/submit'
import { obtenerUsuarioActual } from '#/server/functions/auth'
import { ProblemDescription } from '#/components/ProblemDescription'
import { CodeEditor } from '#/components/CodeEditor'
import { RunResults } from '#/components/RunResults'
import { SubmitResult } from '#/components/SubmitResult'
import { AssistantModal } from '#/components/AssistantModal'
import { serializarCanonico } from '#/server/judge/serializar'
import type { ResultadoCasoPublico } from '#/server/judge/resultadoPublico'

export const Route = createFileRoute('/problemas/$problemaId')({
  loader: async ({ params }) => {
    const [datosProblema, user] = await Promise.all([
      obtenerProblema({ data: params.problemaId }),
      obtenerUsuarioActual().catch(() => null),
    ])
    return { ...datosProblema, user }
  },
  component: ProblemDetailPage,
})

function ProblemDetailPage() {
  const { problemaId } = Route.useParams()
  const { problema, casosPrueba, lenguajes, user } = Route.useLoaderData()
  const [lenguaje, setLenguaje] = useState(lenguajes[0]?.lenguaje ?? '')
  const [codigo, setCodigo] = useState(lenguajes[0]?.codigoInicial ?? '')
  const [resultadosEjecucion, setResultadosEjecucion] = useState<ResultadoCasoPublico[] | null>(null)
  const [errorEjecucion, setErrorEjecucion] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [ejecutando, setEjecutando] = useState(false)
  const [resultadoEnvio, setResultadoEnvio] = useState<{ envioId: string; veredicto: string } | null>(null)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [mostrarAsistente, setMostrarAsistente] = useState(false)

  if (!problema) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold">Problema no encontrado</h1>
        <p className="text-red-600">No existe un problema con el id "{problemaId}".</p>
      </div>
    )
  }

  const problemaIdActual = problema.id
  const ejemplos = casosPrueba
    .filter((c) => c.visible)
    .map((c) => ({ argumentos: c.argumentos, salidaEsperadaTexto: serializarCanonico(c.salidaEsperada, problema.tipoRetorno) }))

  function handleLenguajeChange(nuevoLenguaje: string) {
    setLenguaje(nuevoLenguaje)
    const config = lenguajes.find((l) => l.lenguaje === nuevoLenguaje)
    setCodigo(config?.codigoInicial ?? '')
  }

  async function handleRun() {
    setEjecutando(true)
    try {
      const { resultados, error, hint: nuevoHint } = await ejecutarCodigo({
        data: { problemaId: problemaIdActual, lenguaje, codigo },
      })
      setResultadosEjecucion(resultados)
      setErrorEjecucion(error)
      setHint(nuevoHint)
    } finally {
      setEjecutando(false)
    }
  }

  async function handleSubmit() {
    setEnviando(true)
    try {
      const resultado = await enviarCodigo({ data: { problemaId: problemaIdActual, lenguaje, codigo } })
      if (resultado.error || !resultado.veredicto) {
        setErrorEnvio(resultado.error ?? 'No se pudo evaluar el envío.')
        setResultadoEnvio(null)
      } else {
        setResultadoEnvio({ envioId: resultado.envioId, veredicto: resultado.veredicto })
        setErrorEnvio(null)
      }
    } catch (err) {
      setErrorEnvio(err instanceof Error ? err.message : String(err))
      setResultadoEnvio(null)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <ProblemDescription titulo={problema.titulo} descripcion={problema.descripcion} dificultad={problema.dificultad} ejemplos={ejemplos} />
      <div>
        <select className="border p-2" value={lenguaje} onChange={(e) => handleLenguajeChange(e.target.value)}>
          {lenguajes.map((l) => (
            <option key={l.lenguaje} value={l.lenguaje}>
              {l.lenguaje}
            </option>
          ))}
        </select>
        <CodeEditor lenguaje={lenguaje} value={codigo} onChange={setCodigo} />
        <button className="mt-2 rounded bg-gray-700 px-4 py-2 text-white" onClick={handleRun} disabled={ejecutando}>
          {ejecutando ? 'Ejecutando...' : 'Run'}
        </button>
        {errorEjecucion && <p className="mt-4 text-red-600">{errorEjecucion}</p>}
        {!errorEjecucion && resultadosEjecucion && <RunResults results={resultadosEjecucion} hint={hint} />}
        <button className="mt-2 ml-2 rounded bg-blue-600 px-4 py-2 text-white" onClick={handleSubmit} disabled={enviando}>
          {enviando ? 'Enviando...' : 'Submit'}
        </button>
        {errorEnvio && <p className="mt-4 text-red-600">{errorEnvio}</p>}
        {!errorEnvio && resultadoEnvio && (
          <SubmitResult envioId={resultadoEnvio.envioId} veredicto={resultadoEnvio.veredicto} mostrarFeedback={user?.categoria === 'invitado'} />
        )}
        {user && user.categoria === 'invitado' && (
          <button className="mt-2 ml-2 rounded bg-purple-600 px-4 py-2 text-white" onClick={() => setMostrarAsistente(true)}>
            Preguntar a Haiku
          </button>
        )}
        {mostrarAsistente && user && (
          <AssistantModal problemaId={problemaIdActual} preguntasUsadas={user.preguntasIaUsadas} onClose={() => setMostrarAsistente(false)} />
        )}
      </div>
    </div>
  )
}
```

Cambiar de lenguaje reinicia `codigo` al `codigoInicial` de ese lenguaje (se pierde lo que se había escrito en el lenguaje anterior — decisión ya confirmada).

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores originados en estos cuatro archivos.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProblemDescription.tsx src/components/RunResults.tsx src/routes/problemas/\$problemaId.tsx
git commit -m "feat: tabla de ejemplos autogenerada, reset de lenguaje y resumen de casos ocultos"
```

---

### Task 21: Modelo de puntuación — clasificación

**Files:**
- Modify: `src/server/standings/calculate.ts`
- Modify: `tests/standings.test.ts`

**Interfaces:**
- Produces: `RegistroProblema` (`{ id: string; puntos: number }`), `FilaClasificacion` (con `puntosTotales`), `calcularClasificacion(usuarios, envios, problemas, torneoIniciadoEn)` — nueva firma con 4 argumentos, ordena por puntos.

- [ ] **Step 1: Reescribir `tests/standings.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { calcularClasificacion, agruparClasificacionPorCategoria } from '../src/server/standings/calculate'

const start = new Date('2026-07-13T10:00:00Z')
const problemas = [
  { id: 'p1', puntos: 10 },
  { id: 'p2', puntos: 20 },
]

describe('calcularClasificacion', () => {
  it('returns zero solved and zero points for a user with no submissions', () => {
    const filas = calcularClasificacion([{ id: 'u1', nombre: 'Ana', categoria: 'senior' }], [], problemas, start)
    expect(filas).toEqual([
      { usuarioId: 'u1', nombre: 'Ana', categoria: 'senior', cantidadResueltos: 0, puntosTotales: 0, minutosPenalizacionTotal: 0 },
    ])
  })

  it('counts an accepted submission as solved, sums its points, and applies time penalty', () => {
    const filas = calcularClasificacion(
      [{ id: 'u1', nombre: 'Ana', categoria: 'senior' }],
      [{ usuarioId: 'u1', problemaId: 'p1', estado: 'aceptado', creadoEn: new Date('2026-07-13T10:10:00Z') }],
      problemas,
      start,
    )
    expect(filas[0].cantidadResueltos).toBe(1)
    expect(filas[0].puntosTotales).toBe(10)
    expect(filas[0].minutosPenalizacionTotal).toBe(10)
  })

  it('adds 20 minutes penalty per failed attempt before the accepted one', () => {
    const filas = calcularClasificacion(
      [{ id: 'u1', nombre: 'Ana', categoria: 'senior' }],
      [
        { usuarioId: 'u1', problemaId: 'p1', estado: 'respuesta_incorrecta', creadoEn: new Date('2026-07-13T10:02:00Z') },
        { usuarioId: 'u1', problemaId: 'p1', estado: 'respuesta_incorrecta', creadoEn: new Date('2026-07-13T10:05:00Z') },
        { usuarioId: 'u1', problemaId: 'p1', estado: 'aceptado', creadoEn: new Date('2026-07-13T10:10:00Z') },
      ],
      problemas,
      start,
    )
    expect(filas[0].cantidadResueltos).toBe(1)
    expect(filas[0].puntosTotales).toBe(10)
    expect(filas[0].minutosPenalizacionTotal).toBe(10 + 20 * 2)
  })

  it('does not count a problem with no accepted submission as solved', () => {
    const filas = calcularClasificacion(
      [{ id: 'u1', nombre: 'Ana', categoria: 'senior' }],
      [{ usuarioId: 'u1', problemaId: 'p1', estado: 'respuesta_incorrecta', creadoEn: new Date('2026-07-13T10:05:00Z') }],
      problemas,
      start,
    )
    expect(filas[0].cantidadResueltos).toBe(0)
    expect(filas[0].puntosTotales).toBe(0)
  })

  it('sorts by total points desc, then penalty asc — not by solved count', () => {
    const filas = calcularClasificacion(
      [
        { id: 'u1', nombre: 'Ana', categoria: 'senior' },
        { id: 'u2', nombre: 'Beto', categoria: 'senior' },
      ],
      [
        // Ana resuelve solo p2 (20 pts) — Beto resuelve p1 y p1-otra-vez no aplica, resuelve solo p1 (10 pts).
        { usuarioId: 'u1', problemaId: 'p2', estado: 'aceptado', creadoEn: new Date('2026-07-13T10:30:00Z') },
        { usuarioId: 'u2', problemaId: 'p1', estado: 'aceptado', creadoEn: new Date('2026-07-13T10:05:00Z') },
      ],
      problemas,
      start,
    )
    // Ana tiene menos problemas resueltos (1 vs 1, empatados en cantidad) pero más puntos (20 vs 10) — debe ir primero.
    expect(filas.map((f) => f.usuarioId)).toEqual(['u1', 'u2'])
  })

  it('ignores pending submissions', () => {
    const filas = calcularClasificacion(
      [{ id: 'u1', nombre: 'Ana', categoria: 'junior' }],
      [{ usuarioId: 'u1', problemaId: 'p1', estado: 'pendiente', creadoEn: new Date('2026-07-13T10:05:00Z') }],
      problemas,
      start,
    )
    expect(filas[0].cantidadResueltos).toBe(0)
    expect(filas[0].puntosTotales).toBe(0)
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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/standings.test.ts`
Expected: FAIL (`calcularClasificacion` todavía recibe 3 argumentos y ordena por `cantidadResueltos`)

- [ ] **Step 3: Reescribir `calculate.ts`**

```ts
export type RegistroEnvio = {
  usuarioId: string
  problemaId: string
  estado: 'pendiente' | 'aceptado' | 'respuesta_incorrecta' | 'error_ejecucion' | 'tiempo_excedido'
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

  const porUsuario = new Map<string, RegistroEnvio[]>()
  for (const e of envios) {
    if (e.estado === 'pendiente') continue
    if (!porUsuario.has(e.usuarioId)) porUsuario.set(e.usuarioId, [])
    porUsuario.get(e.usuarioId)!.push(e)
  }

  const filas = usuarios.map((usuario): FilaClasificacion => {
    const enviosUsuario = (porUsuario.get(usuario.id) ?? []).slice().sort(
      (a, b) => a.creadoEn.getTime() - b.creadoEn.getTime(),
    )
    const porProblema = new Map<string, RegistroEnvio[]>()
    for (const e of enviosUsuario) {
      if (!porProblema.has(e.problemaId)) porProblema.set(e.problemaId, [])
      porProblema.get(e.problemaId)!.push(e)
    }

    let cantidadResueltos = 0
    let puntosTotales = 0
    let minutosPenalizacionTotal = 0

    for (const [problemaId, enviosProblema] of porProblema) {
      const indiceAceptado = enviosProblema.findIndex((e) => e.estado === 'aceptado')
      if (indiceAceptado === -1) continue
      cantidadResueltos += 1
      puntosTotales += puntosPorProblema.get(problemaId) ?? 0
      const envioAceptado = enviosProblema[indiceAceptado]
      const intentosFallidosAntes = indiceAceptado
      const minutosDesdeInicio = Math.floor(
        (envioAceptado.creadoEn.getTime() - torneoIniciadoEn.getTime()) / 60000,
      )
      minutosPenalizacionTotal += minutosDesdeInicio + intentosFallidosAntes * 20
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/standings.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/standings/calculate.ts tests/standings.test.ts
git commit -m "feat: rankear el leaderboard por suma de puntos en vez de cantidad resuelta"
```

---

### Task 22: Leaderboard — server function y tabla

**Files:**
- Modify: `src/server/functions/leaderboard.ts`
- Modify: `src/components/LeaderboardTable.tsx`

**Interfaces:**
- Consumes: `calcularClasificacion` con la nueva firma (Task 21), tabla `problemas` (Task 3).
- Produces: `obtenerClasificacion` pasa los puntos de cada problema; `LeaderboardTable` muestra la columna de puntos.

- [ ] **Step 1: Actualizar `leaderboard.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios, envios, estadoTorneo, problemas } from '../db/schema'
import { calcularClasificacion, agruparClasificacionPorCategoria } from '../standings/calculate'
import type { RegistroUsuario, RegistroProblema } from '../standings/calculate'

export const obtenerClasificacion = createServerFn({ method: 'GET' }).handler(async () => {
  const filasEstado = await db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))
  const estado = filasEstado.length > 0 ? filasEstado[0] : null
  if (!estado?.iniciadoEn) {
    return { iniciado: false as const, invitado: [], junior: [], senior: [] }
  }

  const todosUsuarios = await db.select().from(usuarios)
  const todosEnvios = await db.select().from(envios)
  const todosProblemas = await db.select().from(problemas)

  const usuariosElegibles: Array<RegistroUsuario> = todosUsuarios
    .filter((u) => u.rol === 'participante')
    .map((u) => ({ id: u.id, nombre: u.name, categoria: u.categoria }))

  const problemasConPuntos: Array<RegistroProblema> = todosProblemas.map((p) => ({ id: p.id, puntos: p.puntos }))

  const filas = calcularClasificacion(
    usuariosElegibles,
    todosEnvios.map((e) => ({
      usuarioId: e.usuarioId,
      problemaId: e.problemaId,
      estado: e.estado,
      creadoEn: e.creadoEn,
    })),
    problemasConPuntos,
    estado.iniciadoEn,
  )
  const agrupado = agruparClasificacionPorCategoria(filas)
  return { iniciado: true as const, ...agrupado }
})
```

- [ ] **Step 2: Actualizar `LeaderboardTable.tsx`**

```tsx
import type { FilaClasificacion } from '#/server/standings/calculate'

export function LeaderboardTable({ title, rows }: { title: string; rows: Array<FilaClasificacion> }) {
  return (
    <div>
      <h2 className="text-lg font-bold">{title}</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2 text-left">#</th>
            <th className="border p-2 text-left">Nombre</th>
            <th className="border p-2 text-left">Puntos</th>
            <th className="border p-2 text-left">Resueltos</th>
            <th className="border p-2 text-left">Tiempo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.usuarioId}>
              <td className="border p-2">{i + 1}</td>
              <td className="border p-2">{row.nombre}</td>
              <td className="border p-2">{row.puntosTotales}</td>
              <td className="border p-2">{row.cantidadResueltos}</td>
              <td className="border p-2">{Math.round(row.minutosPenalizacionTotal)} min</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Verificar tipos y correr toda la suite**

Run: `npx tsc --noEmit && npm test`
Expected: sin errores de tipos; todos los tests en PASS.

- [ ] **Step 4: Commit**

```bash
git add src/server/functions/leaderboard.ts src/components/LeaderboardTable.tsx
git commit -m "feat: mostrar puntos en el leaderboard"
```
