# Categorías (Invitados/Junior/Senior) y Registro Manual — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el login OAuth (Google/GitHub) y la autoselección de categoría por un registro manual admin-only con 3 categorías (Invitados/Junior/Senior), credenciales de correo+contraseña enviadas por Brevo, filtrado de ejercicios por grupo, y una cadencia de hints de Haiku exclusiva para Invitados.

**Architecture:** TanStack Start + Better Auth (proveedor email+contraseña, sin OAuth) + Drizzle/MySQL. Las cuentas se crean directamente contra las tablas de Better Auth (`usuarios`/`cuentas`) usando `hashPassword` de `better-auth/crypto`, sin pasar por el endpoint público de signup (deshabilitado). El correo de bienvenida se envía vía la API REST de Brevo con `fetch` (mismo estilo que `piston/client.ts`). La lógica pura (generación de contraseña, cadencia de hints, agrupamiento de problemas) vive en módulos testeables separados de los server functions que los envuelven con auth/HTTP — mismo patrón que el resto del proyecto (`standings/calculate.ts` + `functions/leaderboard.ts`, `checkin/result.ts` + `functions/checkin.ts`).

**Tech Stack:** TanStack Start, Better Auth 1.6, Drizzle ORM (MySQL), Vitest, Brevo (API REST vía `fetch`), Claude Haiku 4.5.

## Global Constraints

- Todo el código, nombres de tablas/columnas/funciones/variables, mensajes de commit y ramas van en español (excepto: claves de Better Auth como `email`/`password`/`providerId`, nombres de carpetas/rutas ya establecidos como `auth`/`db`/`claude`/`piston`, y convenciones genéricas de React como `onClick`/`onChange`/`value`).
- Los cambios de esquema se aplican con `npx drizzle-kit push` (este proyecto no usa archivos de migración generados — confirmado en `drizzle.config.ts` y `docs/deployment.md`).
- Los server functions (`createServerFn`) que combinan auth + DB + HTTP no se testean directamente en este proyecto (no hay tests para `run.ts`, `submit.ts`, `checkin.ts`, `assistant.ts` hoy). Se testea la lógica pura que consumen, en módulos separados. Sigue ese mismo patrón para todo el código nuevo.
- Cuando un paso requiera verificación manual/navegador (login real, envío real de correo, uso en vivo de la pantalla de admin) — anótalo como seguimiento pendiente, no como bloqueante. Así se ha manejado el resto del proyecto.
- Spec de referencia: `docs/superpowers/specs/2026-07-14-categorias-registro-manual-design.md`.

---

## Nota de implementación importante (leer antes de Task 1)

Better Auth 1.6 (la versión instalada) bloquea el endpoint `/sign-up/email` de forma **incondicional** cuando `emailAndPassword.disableSignUp` es `true` — no hay excepción para llamadas server-side ni admin (confirmado leyendo `node_modules/better-auth/dist/api/routes/sign-up.mjs:143`). Por lo tanto, para que el admin pueda crear cuentas mientras el autoregistro sigue bloqueado, **no se usa `auth.api.signUpEmail`** en ningún punto. En su lugar, las cuentas se crean insertando directamente en `usuarios`/`cuentas` vía Drizzle, hasheando la contraseña con `hashPassword` de `better-auth/crypto` (misma función que Better Auth usa internamente — confirmado en `node_modules/better-auth/dist/crypto/password.d.mts`). Esto también significa que la tabla `cuentas` necesita una columna `password` que hoy no existe (Task 1).

---

### Task 1: Esquema de base de datos — categorías, carné, credenciales y corridas de "Run"

**Files:**
- Modify: `src/server/db/schema.ts`
- Test: `tests/db.test.ts`

**Interfaces:**
- Produces: `usuarios.categoria: 'invitado' | 'junior' | 'senior'` (NOT NULL), `usuarios.carnet: string | null`, `cuentas.password: string | null` (columna nueva, campo Drizzle `password` — nombre exigido por Better Auth internamente), tabla `corridas` (`id`, `usuarioId`, `problemaId`, `contador`, único por par usuario+problema), `problemas.grupo: 'invitado_junior' | 'senior'` (NOT NULL).

- [ ] **Step 1: Escribir el test que falla**

Agrega al final de `tests/db.test.ts`:

```typescript
import { and, eq, sql } from 'drizzle-orm'
import { usuarios, problemas, corridas } from '../src/server/db/schema'

describe('categorías y corridas', () => {
  it('inserta y lee un usuario invitado con carné', async () => {
    const id = crypto.randomUUID()
    await db.insert(usuarios).values({
      id,
      name: 'Ana Invitada',
      email: `ana-${id}@example.com`,
      categoria: 'invitado',
      carnet: '22-1234-2020',
    })
    const rows = await db.select().from(usuarios).where(eq(usuarios.id, id))
    const usuario = rows.length > 0 ? rows[0] : null
    expect(usuario?.categoria).toBe('invitado')
    expect(usuario?.carnet).toBe('22-1234-2020')
  })

  it('acepta un problema con grupo invitado_junior o senior', async () => {
    const id = crypto.randomUUID()
    await db.insert(problemas).values({
      id,
      titulo: 'Suma',
      descripcion: 'Suma dos números',
      dificultad: 'easy',
      lenguajesPermitidos: ['python'],
      grupo: 'senior',
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
      lenguajesPermitidos: ['python'],
      grupo: 'invitado_junior',
    })

    for (let i = 0; i < 2; i++) {
      await db
        .insert(corridas)
        .values({ usuarioId, problemaId, contador: 1 })
        .onDuplicateKeyUpdate({ set: { contador: sql`${corridas.contador} + 1` } })
    }

    const rows = await db
      .select()
      .from(corridas)
      .where(and(eq(corridas.usuarioId, usuarioId), eq(corridas.problemaId, problemaId)))
    expect(rows[0]?.contador).toBe(2)
  })
})
```

- [ ] **Step 2: Ejecutar el test y confirmar que falla**

Run: `npm test -- tests/db.test.ts`
Expected: FAIL — `categoria` no acepta `'invitado'` (o error de MySQL por enum/columna inexistente: `carnet`, `grupo`, tabla `corridas`).

- [ ] **Step 3: Editar el esquema**

Reemplaza el contenido completo de `src/server/db/schema.ts`:

```typescript
import {
  mysqlTable,
  text,
  timestamp,
  int,
  boolean,
  json,
  mysqlEnum,
  unique,
} from 'drizzle-orm/mysql-core'

// Tablas centrales de Better Auth
export const usuarios = mysqlTable('usuario', {
  id: text('id').primaryKey(),
  name: text('nombre').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('correo_verificado').notNull().default(false),
  image: text('imagen'),
  createdAt: timestamp('creado_en').notNull().defaultNow(),
  updatedAt: timestamp('actualizado_en').notNull().defaultNow(),
  rol: mysqlEnum('rol', ['participante', 'admin']).notNull().default('participante'),
  categoria: mysqlEnum('categoria', ['invitado', 'junior', 'senior']).notNull(),
  carnet: text('carnet'),
  tokenIngreso: text('token_ingreso')
    .$defaultFn(() => crypto.randomUUID())
    .notNull()
    .unique(),
  ingresadoEn: timestamp('ingresado_en'),
  preguntasIaUsadas: int('preguntas_ia_usadas').notNull().default(0),
})

export const sesiones = mysqlTable('sesion', {
  id: text('id').primaryKey(),
  userId: text('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expira_en').notNull(),
  createdAt: timestamp('creado_en').notNull().defaultNow(),
  updatedAt: timestamp('actualizado_en').notNull().defaultNow(),
  ipAddress: text('direccion_ip'),
  userAgent: text('agente_usuario'),
})

export const cuentas = mysqlTable('cuenta', {
  id: text('id').primaryKey(),
  userId: text('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  accountId: text('id_cuenta_proveedor').notNull(),
  providerId: text('id_proveedor').notNull(),
  password: text('contrasena'),
  accessToken: text('token_acceso'),
  refreshToken: text('token_refresco'),
  accessTokenExpiresAt: timestamp('token_acceso_expira_en'),
  refreshTokenExpiresAt: timestamp('token_refresco_expira_en'),
  scope: text('alcance'),
  idToken: text('id_token'),
  createdAt: timestamp('creado_en').notNull().defaultNow(),
  updatedAt: timestamp('actualizado_en').notNull().defaultNow(),
})

export const verificaciones = mysqlTable('verificacion', {
  id: text('id').primaryKey(),
  identifier: text('identificador').notNull(),
  value: text('valor').notNull(),
  expiresAt: timestamp('expira_en').notNull(),
  createdAt: timestamp('creado_en').notNull().defaultNow(),
})

// Tablas de dominio
export const problemas = mysqlTable('problemas', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  titulo: text('titulo').notNull(),
  descripcion: text('descripcion').notNull(),
  dificultad: text('dificultad').notNull(),
  lenguajesPermitidos: json('lenguajes_permitidos').$type<string[]>().notNull(),
  orden: int('orden').notNull().default(0),
  grupo: mysqlEnum('grupo', ['invitado_junior', 'senior']).notNull(),
})

export const casosPrueba = mysqlTable('casos_prueba', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  problemaId: text('problema_id')
    .notNull()
    .references(() => problemas.id, { onDelete: 'cascade' }),
  entrada: text('entrada').notNull(),
  salidaEsperada: text('salida_esperada').notNull(),
})

export const envios = mysqlTable('envios', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  usuarioId: text('usuario_id')
    .notNull()
    .references(() => usuarios.id),
  problemaId: text('problema_id')
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
  comentarioClaude: text('comentario_claude'),
  creadoEn: timestamp('creado_en').notNull().defaultNow(),
})

export const preguntasIa = mysqlTable('preguntas_ia', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  usuarioId: text('usuario_id')
    .notNull()
    .references(() => usuarios.id),
  problemaId: text('problema_id').references(() => problemas.id),
  pregunta: text('pregunta').notNull(),
  respuesta: text('respuesta').notNull(),
  creadoEn: timestamp('creado_en').notNull().defaultNow(),
})

export const corridas = mysqlTable(
  'corridas',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    problemaId: text('problema_id')
      .notNull()
      .references(() => problemas.id, { onDelete: 'cascade' }),
    contador: int('contador').notNull().default(0),
  },
  (table) => [unique('corridas_usuario_problema_unico').on(table.usuarioId, table.problemaId)],
)

export const estadoTorneo = mysqlTable('estado_torneo', {
  id: int('id').primaryKey().default(1),
  iniciadoEn: timestamp('iniciado_en'),
})
```

**Nota:** las cuentas `admin` (que se crean manualmente en la base de datos, no vía la pantalla de registro) también necesitan un valor de `categoria` porque la columna ahora es NOT NULL — usa cualquier valor válido (ej. `'senior'`), es un campo sin significado para un admin. Esto ya era cierto conceptualmente antes (el campo no aplicaba a admins), solo que antes `categoria` era nullable y ahora hay que darle un valor explícito. Anota esto en `docs/deployment.md` junto a las instrucciones existentes de "marcar un usuario como admin manualmente" (si existen) o como comentario en el propio código donde se documenta ese paso.

- [ ] **Step 4: Aplicar el esquema a la base de datos**

Run: `npx drizzle-kit push`
Expected: confirma los cambios cuando se pregunte (nuevas columnas/tabla). Esto corre contra la base de datos de desarrollo apuntada por `DATABASE_URL` en `.env`.

- [ ] **Step 5: Ejecutar el test y confirmar que pasa**

Run: `npm test -- tests/db.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/server/db/schema.ts tests/db.test.ts
git commit -m "feat: agregar categoría invitado, carné, contraseña de cuenta y tabla de corridas"
```

---

### Task 2: Generador de contraseña aleatoria

**Files:**
- Create: `src/server/auth/password.ts`
- Test: `tests/password.test.ts`

**Interfaces:**
- Produces: `generarContrasenaAleatoria(): string` — 12 caracteres alfanuméricos+`-_`, generados con `crypto.randomBytes`.

- [ ] **Step 1: Escribir el test que falla**

Crea `tests/password.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generarContrasenaAleatoria } from '../src/server/auth/password'

describe('generarContrasenaAleatoria', () => {
  it('genera una contraseña de 12 caracteres', () => {
    expect(generarContrasenaAleatoria()).toHaveLength(12)
  })

  it('solo usa caracteres seguros para URL/correo', () => {
    expect(generarContrasenaAleatoria()).toMatch(/^[A-Za-z0-9_-]{12}$/)
  })

  it('genera contraseñas distintas en llamadas distintas', () => {
    expect(generarContrasenaAleatoria()).not.toBe(generarContrasenaAleatoria())
  })
})
```

- [ ] **Step 2: Ejecutar el test y confirmar que falla**

Run: `npm test -- tests/password.test.ts`
Expected: FAIL con "Cannot find module '../src/server/auth/password'"

- [ ] **Step 3: Implementación mínima**

Crea `src/server/auth/password.ts`:

```typescript
import { randomBytes } from 'node:crypto'

export function generarContrasenaAleatoria(): string {
  return randomBytes(9).toString('base64url')
}
```

- [ ] **Step 4: Ejecutar el test y confirmar que pasa**

Run: `npm test -- tests/password.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/password.ts tests/password.test.ts
git commit -m "feat: agregar generador de contraseña aleatoria para registro manual"
```

---

### Task 3: Reconfigurar Better Auth (correo + contraseña, sin OAuth) y formulario de login

**Files:**
- Modify: `src/server/auth/auth.ts`
- Modify: `src/routes/index.tsx`
- Modify: `.env.example`
- Modify: `docs/deployment.md`
- Test: `tests/auth-config.test.ts`

**Interfaces:**
- Consumes: nada nuevo (usa `betterAuth` igual que antes).
- Produces: `auth.options.emailAndPassword = { enabled: true, disableSignUp: true }`; `auth.options.socialProviders` ya no existe; `additionalFields.carnet`.

- [ ] **Step 1: Escribir el test que falla**

Crea `tests/auth-config.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { auth } from '../src/server/auth/auth'

describe('configuración de Better Auth', () => {
  it('habilita login por correo y contraseña, sin autoregistro público', () => {
    expect(auth.options.emailAndPassword?.enabled).toBe(true)
    expect(auth.options.emailAndPassword?.disableSignUp).toBe(true)
  })

  it('no configura proveedores OAuth', () => {
    expect(auth.options.socialProviders).toBeUndefined()
  })
})
```

- [ ] **Step 2: Ejecutar el test y confirmar que falla**

Run: `npm test -- tests/auth-config.test.ts`
Expected: FAIL — `emailAndPassword` es `undefined`, `socialProviders` está definido (google/github).

- [ ] **Step 3: Editar `src/server/auth/auth.ts`**

Reemplaza el contenido completo:

```typescript
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../db/client'
import * as schema from '../db/schema'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'mysql',
    schema: {
      user: schema.usuarios,
      session: schema.sesiones,
      account: schema.cuentas,
      verification: schema.verificaciones,
    },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      rol: { type: 'string', defaultValue: 'participante', input: false },
      categoria: { type: 'string', required: true, input: false },
      carnet: { type: 'string', required: false, input: false },
      tokenIngreso: { type: 'string', input: false },
      ingresadoEn: { type: 'date', required: false, input: false },
      preguntasIaUsadas: { type: 'number', defaultValue: 0, input: false },
    },
  },
})

export type SessionUser =
  Awaited<ReturnType<typeof auth.api.getSession>> extends infer S
    ? S extends { user: infer U }
      ? U
      : never
    : never
```

- [ ] **Step 4: Ejecutar el test y confirmar que pasa**

Run: `npm test -- tests/auth-config.test.ts`
Expected: PASS

- [ ] **Step 5: Reemplazar los botones de OAuth por un formulario de correo+contraseña**

Reemplaza el contenido completo de `src/routes/index.tsx`:

```tsx
import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createAuthClient } from 'better-auth/react'

const authClient = createAuthClient()

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    const { error: errorLogin } = await authClient.signIn.email({
      email: correo,
      password: contrasena,
    })
    setEnviando(false)
    if (errorLogin) {
      setError('Correo o contraseña incorrectos.')
      return
    }
    await navigate({ to: '/perfil' })
  }

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Torneo de Programación</h1>
      <form className="flex w-72 flex-col gap-4" onSubmit={handleLogin}>
        <p className="text-sm text-gray-500">
          Usa el correo y la contraseña que te llegaron por correo cuando te registraste.
        </p>
        <input
          className="border p-2"
          type="email"
          placeholder="Correo"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
        />
        <input
          className="border p-2"
          type="password"
          placeholder="Contraseña"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          required
        />
        <button
          className="rounded bg-blue-600 px-6 py-3 text-white disabled:bg-gray-300"
          type="submit"
          disabled={enviando}
        >
          {enviando ? 'Ingresando...' : 'Iniciar sesión'}
        </button>
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </div>
  )
}
```

**Nota de seguimiento (verificación manual):** este flujo requiere un login real contra una base de datos con un participante ya registrado — no se puede probar automáticamente en este entorno sin un navegador. Verificar manualmente antes del evento: registrar un participante de prueba (Task 5/6), confirmar que el login con esas credenciales funciona y redirige a `/perfil`.

- [ ] **Step 6: Actualizar variables de entorno**

Edita `.env.example`, elimina las líneas de Google/GitHub:

```
DATABASE_URL=mysql://root:root@localhost:3306/torneo
ANTHROPIC_API_KEY=
BETTER_AUTH_SECRET=
PISTON_URL=http://localhost:2000
BREVO_API_KEY=
BREVO_CORREO_REMITENTE=
```

(Las variables `BREVO_*` se usan en la Task 4; se agregan aquí para que `.env.example` quede completo de una vez.)

- [ ] **Step 7: Actualizar `docs/deployment.md`**

Busca las menciones de `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` en `docs/deployment.md` y elimínalas de la lista de variables de entorno requeridas. Agrega una nota junto a la lista de variables:

```
- `BREVO_API_KEY` / `BREVO_CORREO_REMITENTE`: credenciales de Brevo (ver Task 4) para enviar el correo de bienvenida con usuario y contraseña a cada participante registrado manualmente.
- Ya no se usa login OAuth (Google/GitHub): las cuentas las crea el administrador desde `/admin/participantes`, con correo + contraseña generada.
```

- [ ] **Step 8: Commit**

```bash
git add src/server/auth/auth.ts src/routes/index.tsx .env.example docs/deployment.md tests/auth-config.test.ts
git commit -m "feat: reemplazar login OAuth por correo y contraseña, sin autoregistro público"
```

---

### Task 4: Envío de correo de bienvenida (Brevo)

**Files:**
- Create: `src/server/email/brevo.ts`
- Test: `tests/brevo.test.ts`

**Interfaces:**
- Produces: `construirCorreoBienvenida(input: { nombre: string; correo: string; contrasena: string }): { to: { email: string; name: string }[]; sender: { email: string; name: string }; subject: string; htmlContent: string }` (pura, testeada), `enviarCorreoBienvenida(input: { nombre: string; correo: string; contrasena: string }): Promise<void>` (llamada real a Brevo vía `fetch`, no testeada directamente — mismo criterio que `ejecutarPiston` en `src/server/piston/client.ts`, que tampoco tiene test directo).

- [ ] **Step 1: Escribir el test que falla**

Crea `tests/brevo.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { construirCorreoBienvenida } from '../src/server/email/brevo'

describe('construirCorreoBienvenida', () => {
  it('incluye el nombre, el correo como destinatario, y la contraseña en el cuerpo', () => {
    const correo = construirCorreoBienvenida({
      nombre: 'Ana Pérez',
      correo: 'ana@example.com',
      contrasena: 'abc123XYZ456',
    })
    expect(correo.to).toEqual([{ email: 'ana@example.com', name: 'Ana Pérez' }])
    expect(correo.htmlContent).toContain('Ana Pérez')
    expect(correo.htmlContent).toContain('ana@example.com')
    expect(correo.htmlContent).toContain('abc123XYZ456')
  })

  it('usa el remitente configurado por variable de entorno', () => {
    process.env.BREVO_CORREO_REMITENTE = 'torneo@example.com'
    const correo = construirCorreoBienvenida({
      nombre: 'Ana',
      correo: 'ana@example.com',
      contrasena: 'x',
    })
    expect(correo.sender.email).toBe('torneo@example.com')
  })
})
```

- [ ] **Step 2: Ejecutar el test y confirmar que falla**

Run: `npm test -- tests/brevo.test.ts`
Expected: FAIL con "Cannot find module '../src/server/email/brevo'"

- [ ] **Step 3: Implementación mínima**

Crea `src/server/email/brevo.ts`:

```typescript
export function construirCorreoBienvenida(input: {
  nombre: string
  correo: string
  contrasena: string
}) {
  return {
    to: [{ email: input.correo, name: input.nombre }],
    sender: {
      email: process.env.BREVO_CORREO_REMITENTE ?? '',
      name: 'Torneo de Programación',
    },
    subject: 'Tus credenciales para el Torneo de Programación',
    htmlContent: [
      `<p>Hola ${input.nombre},</p>`,
      `<p>Ya quedaste registrado para el torneo. Usa estas credenciales para iniciar sesión el día del evento:</p>`,
      `<p><strong>Usuario (correo):</strong> ${input.correo}<br/>`,
      `<strong>Contraseña:</strong> ${input.contrasena}</p>`,
      `<p>Guarda este correo, lo necesitarás para entrar al sistema.</p>`,
    ].join('\n'),
  }
}

export async function enviarCorreoBienvenida(input: {
  nombre: string
  correo: string
  contrasena: string
}): Promise<void> {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY ?? '',
    },
    body: JSON.stringify(construirCorreoBienvenida(input)),
  })

  if (!response.ok) {
    throw new Error(`La solicitud a Brevo falló: ${response.status}`)
  }
}
```

- [ ] **Step 4: Ejecutar el test y confirmar que pasa**

Run: `npm test -- tests/brevo.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/email/brevo.ts tests/brevo.test.ts
git commit -m "feat: agregar envío de correo de bienvenida con credenciales vía Brevo"
```

---

### Task 5: Registro manual de participantes (creación de cuenta + server functions)

**Files:**
- Create: `src/server/participantes/crear.ts`
- Create: `src/server/functions/participantes.ts`
- Test: `tests/crear-participante.test.ts`

**Interfaces:**
- Consumes: `generarContrasenaAleatoria` (Task 2), `hashPassword`/`verifyPassword` de `better-auth/crypto`, `enviarCorreoBienvenida` (Task 4), `requerirAdmin` (existente, `src/server/auth/middleware.ts`).
- Produces: `crearCuentaParticipante(input: { nombre: string; correo: string; categoria: 'invitado' | 'junior' | 'senior'; carnet: string | null }): Promise<{ id: string; contrasenaGenerada: string }>`; server functions `registrarParticipante` y `reenviarCredenciales`.

- [ ] **Step 1: Escribir el test que falla**

Crea `tests/crear-participante.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { verifyPassword } from 'better-auth/crypto'
import { db } from '../src/server/db/client'
import { cuentas } from '../src/server/db/schema'
import { crearCuentaParticipante } from '../src/server/participantes/crear'

describe('crearCuentaParticipante', () => {
  it('crea el usuario y una cuenta credential con la contraseña generada', async () => {
    const correo = `test-${crypto.randomUUID()}@example.com`
    const { id, contrasenaGenerada } = await crearCuentaParticipante({
      nombre: 'Ana',
      correo,
      categoria: 'invitado',
      carnet: '22-1234-2020',
    })

    const filasCuenta = await db.select().from(cuentas).where(eq(cuentas.userId, id))
    const cuenta = filasCuenta.length > 0 ? filasCuenta[0] : null
    expect(cuenta?.providerId).toBe('credential')
    expect(cuenta?.password).toBeTruthy()
    expect(
      await verifyPassword({ hash: cuenta!.password!, password: contrasenaGenerada }),
    ).toBe(true)
  })

  it('rechaza un correo que ya está registrado', async () => {
    const correo = `dup-${crypto.randomUUID()}@example.com`
    await crearCuentaParticipante({ nombre: 'Ana', correo, categoria: 'invitado', carnet: null })
    await expect(
      crearCuentaParticipante({ nombre: 'Ana 2', correo, categoria: 'junior', carnet: null }),
    ).rejects.toThrow('Ya existe una cuenta con ese correo')
  })
})
```

- [ ] **Step 2: Ejecutar el test y confirmar que falla**

Run: `npm test -- tests/crear-participante.test.ts`
Expected: FAIL con "Cannot find module '../src/server/participantes/crear'"

- [ ] **Step 3: Implementación mínima**

Crea `src/server/participantes/crear.ts`:

```typescript
import { eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { db } from '../db/client'
import { usuarios, cuentas } from '../db/schema'
import { generarContrasenaAleatoria } from '../auth/password'

export async function crearCuentaParticipante(input: {
  nombre: string
  correo: string
  categoria: 'invitado' | 'junior' | 'senior'
  carnet: string | null
}): Promise<{ id: string; contrasenaGenerada: string }> {
  const existentes = await db.select().from(usuarios).where(eq(usuarios.email, input.correo))
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

- [ ] **Step 4: Ejecutar el test y confirmar que pasa**

Run: `npm test -- tests/crear-participante.test.ts`
Expected: PASS

- [ ] **Step 5: Crear los server functions (sin test directo, mismo criterio que el resto de `src/server/functions/*.ts`)**

Crea `src/server/functions/participantes.ts`:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { db } from '../db/client'
import { usuarios, cuentas } from '../db/schema'
import { requerirAdmin } from '../auth/middleware'
import { crearCuentaParticipante } from '../participantes/crear'
import { generarContrasenaAleatoria } from '../auth/password'
import { enviarCorreoBienvenida } from '../email/brevo'

type DatosParticipante = {
  nombre: string
  correo: string
  categoria: 'invitado' | 'junior' | 'senior'
  carnet: string | null
}

export const registrarParticipante = createServerFn({ method: 'POST' })
  .validator((input: DatosParticipante) => input)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const { id, contrasenaGenerada } = await crearCuentaParticipante(data)

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
      categoria: data.categoria,
      correoEnviado,
      contrasenaGenerada,
    }
  })

export const reenviarCredenciales = createServerFn({ method: 'POST' })
  .validator((usuarioId: string) => usuarioId)
  .handler(async ({ data }) => {
    const request = getRequest()
    await requerirAdmin(request.headers)

    const filas = await db.select().from(usuarios).where(eq(usuarios.id, data))
    const usuario = filas.length > 0 ? filas[0] : null
    if (!usuario) throw new Error('Participante no encontrado')

    const contrasenaGenerada = generarContrasenaAleatoria()
    const hash = await hashPassword(contrasenaGenerada)
    await db
      .update(cuentas)
      .set({ password: hash })
      .where(and(eq(cuentas.userId, data), eq(cuentas.providerId, 'credential')))

    let correoEnviado = true
    try {
      await enviarCorreoBienvenida({
        nombre: usuario.name,
        correo: usuario.email,
        contrasena: contrasenaGenerada,
      })
    } catch (err) {
      console.error('No se pudo enviar el correo de bienvenida', err)
      correoEnviado = false
    }

    return { correoEnviado, contrasenaGenerada }
  })
```

- [ ] **Step 6: Commit**

```bash
git add src/server/participantes/crear.ts src/server/functions/participantes.ts tests/crear-participante.test.ts
git commit -m "feat: agregar registro manual de participantes con envío de credenciales"
```

---

### Task 6: Pantalla admin `/admin/participantes`

**Files:**
- Create: `src/routes/admin/participantes.tsx`

**Interfaces:**
- Consumes: `registrarParticipante`, `reenviarCredenciales` (Task 5).

- [ ] **Step 1: Crear la pantalla**

Crea `src/routes/admin/participantes.tsx`:

```tsx
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { registrarParticipante, reenviarCredenciales } from '#/server/functions/participantes'

export const Route = createFileRoute('/admin/participantes')({
  component: AdminParticipantsPage,
})

type Categoria = 'invitado' | 'junior' | 'senior'

type ParticipanteRegistrado = {
  id: string
  nombre: string
  correo: string
  categoria: Categoria
  correoEnviado: boolean
  contrasenaGenerada: string
}

function AdminParticipantsPage() {
  const [categoriaSalon, setCategoriaSalon] = useState<Categoria>('invitado')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [esUniversitario, setEsUniversitario] = useState(true)
  const [carnet, setCarnet] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registrados, setRegistrados] = useState<ParticipanteRegistrado[]>([])

  async function handleRegistrar(e: React.FormEvent) {
    e.preventDefault()
    setRegistrando(true)
    setError(null)
    try {
      const resultado = await registrarParticipante({
        data: {
          nombre,
          correo,
          categoria: categoriaSalon,
          carnet: esUniversitario && carnet.trim() ? carnet.trim() : null,
        },
      })
      setRegistrados([resultado, ...registrados])
      setNombre('')
      setCorreo('')
      setCarnet('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRegistrando(false)
    }
  }

  async function handleReenviar(usuarioId: string) {
    const resultado = await reenviarCredenciales({ data: usuarioId })
    setRegistrados(
      registrados.map((p) =>
        p.id === usuarioId
          ? { ...p, correoEnviado: resultado.correoEnviado, contrasenaGenerada: resultado.contrasenaGenerada }
          : p,
      ),
    )
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-xl font-bold">Registrar participantes</h1>

      <div>
        <label className="mr-2 font-bold">Categoría de este salón:</label>
        <select
          className="border p-2"
          value={categoriaSalon}
          onChange={(e) => setCategoriaSalon(e.target.value as Categoria)}
        >
          <option value="invitado">Invitados</option>
          <option value="junior">Junior</option>
          <option value="senior">Senior</option>
        </select>
      </div>

      <form className="flex flex-col gap-2" onSubmit={handleRegistrar}>
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
        <label>
          <input
            type="checkbox"
            checked={esUniversitario}
            onChange={(e) => setEsUniversitario(e.target.checked)}
          />{' '}
          Es universitario (tiene carné)
        </label>
        {esUniversitario && (
          <input
            className="border p-2"
            placeholder="Carné"
            value={carnet}
            onChange={(e) => setCarnet(e.target.value)}
          />
        )}
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:bg-gray-300"
          type="submit"
          disabled={registrando}
        >
          {registrando ? 'Registrando...' : `Registrar como ${categoriaSalon}`}
        </button>
        {error && <p className="text-red-600">{error}</p>}
      </form>

      <ul className="flex flex-col gap-2">
        {registrados.map((p) => (
          <li key={p.id} className="border p-2">
            <strong>{p.nombre}</strong> — {p.correo} — {p.categoria}
            {p.correoEnviado ? (
              <span className="ml-2 text-green-600">✅ correo enviado</span>
            ) : (
              <span className="ml-2 text-yellow-600">
                ⚠️ no se pudo enviar el correo — contraseña: {p.contrasenaGenerada}
              </span>
            )}
            <button
              className="ml-2 text-blue-600 underline"
              onClick={() => handleReenviar(p.id)}
            >
              Reenviar credenciales
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

**Nota de seguimiento (verificación manual):** esta pantalla necesita probarse en vivo con el servidor de desarrollo corriendo y una sesión de admin real — registrar una persona de prueba y confirmar que el correo (o el aviso de contraseña visible) aparece correctamente. No hay navegador disponible en este entorno para hacerlo automáticamente.

- [ ] **Step 2: Commit**

```bash
git add src/routes/admin/participantes.tsx
git commit -m "feat: agregar pantalla de admin para registrar participantes"
```

---

### Task 7: Límite y acceso al asistente de IA solo para Invitados

**Files:**
- Modify: `src/server/assistant/limit.ts`
- Modify: `tests/assistant-limit.test.ts`
- Modify: `src/server/claude/assistant.ts`
- Modify: `src/server/functions/assistant.ts`
- Modify: `src/components/AssistantModal.tsx`
- Modify: `src/routes/problemas/$problemaId.tsx`

**Interfaces:**
- Produces: `puedePreguntar(user: { categoria: string; preguntasIaUsadas: number }): boolean` — ahora `categoria === 'invitado' && preguntasIaUsadas < 3`.

- [ ] **Step 1: Actualizar el test para reflejar el nuevo límite y categoría**

Reemplaza el contenido completo de `tests/assistant-limit.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { puedePreguntar } from '../src/server/assistant/limit'

describe('puedePreguntar', () => {
  it('permite a un invitado con 0 preguntas usadas', () => {
    expect(puedePreguntar({ categoria: 'invitado', preguntasIaUsadas: 0 })).toBe(true)
  })

  it('permite a un invitado con 2 preguntas usadas', () => {
    expect(puedePreguntar({ categoria: 'invitado', preguntasIaUsadas: 2 })).toBe(true)
  })

  it('bloquea a un invitado con 3 preguntas usadas', () => {
    expect(puedePreguntar({ categoria: 'invitado', preguntasIaUsadas: 3 })).toBe(false)
  })

  it('bloquea a un junior sin importar las preguntas usadas', () => {
    expect(puedePreguntar({ categoria: 'junior', preguntasIaUsadas: 0 })).toBe(false)
  })

  it('bloquea a un senior sin importar las preguntas usadas', () => {
    expect(puedePreguntar({ categoria: 'senior', preguntasIaUsadas: 0 })).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar el test y confirmar que falla**

Run: `npm test -- tests/assistant-limit.test.ts`
Expected: FAIL — `puedePreguntar({ categoria: 'invitado', ... })` devuelve `false` (la implementación actual solo acepta `'junior'`).

- [ ] **Step 3: Actualizar la implementación**

Reemplaza el contenido completo de `src/server/assistant/limit.ts`:

```typescript
export function puedePreguntar(user: {
  categoria: string
  preguntasIaUsadas: number
}): boolean {
  return user.categoria === 'invitado' && user.preguntasIaUsadas < 3
}
```

- [ ] **Step 4: Ejecutar el test y confirmar que pasa**

Run: `npm test -- tests/assistant-limit.test.ts`
Expected: PASS

- [ ] **Step 5: Renombrar y actualizar el prompt del asistente**

Reemplaza el contenido completo de `src/server/claude/assistant.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Eres un asistente para participantes de categoría Invitados en un torneo de programación.
Solo puedes responder preguntas generales de sintaxis o uso de funciones/estructuras estándar
del lenguaje (por ejemplo: cómo usar .filter en JavaScript, cómo declarar un array en Java).
NUNCA debes dar la lógica o solución del problema que el participante está resolviendo, aunque
la pregunta lo insinúe o lo pida directamente. Si detectas que la pregunta busca la solución del
problema actual, responde amablemente que no puedes ayudar con eso y sugiere que reformule
hacia una pregunta general de sintaxis.`

export async function responderPreguntaInvitado(input: {
  descripcionProblema: string
  pregunta: string
}): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Contexto del problema actual (solo para que sepas qué evitar revelar):\n${input.descripcionProblema}\n\nPregunta del participante: ${input.pregunta}`,
      },
    ],
  })
  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}
```

- [ ] **Step 6: Actualizar `src/server/functions/assistant.ts`** (límite `2` → `3`, import renombrado)

Reemplaza el contenido completo:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, lt, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { problemas, preguntasIa, usuarios } from '../db/schema'
import { requerirParticipanteIngresado } from '../auth/middleware'
import { puedePreguntar } from '../assistant/limit'
import { responderPreguntaInvitado } from '../claude/assistant'

export const preguntarAsistente = createServerFn({ method: 'POST' })
  .validator((input: { problemaId: string; pregunta: string }) => input)
  .handler(async ({ data }) => {
    const request = getRequest()
    const user = await requerirParticipanteIngresado(request.headers)

    if (
      !puedePreguntar({
        categoria: user.categoria,
        preguntasIaUsadas: user.preguntasIaUsadas,
      })
    ) {
      throw new Error('AI_LIMIT_REACHED')
    }

    // Reserva atómicamente un cupo de pregunta antes de llamar a Claude, para que dos
    // solicitudes concurrentes no puedan ambas observar preguntasIaUsadas < 3 y ambas
    // avanzar. La cláusula WHERE se evalúa contra la fila actual de la BD, no contra
    // el valor `user` en memoria (potencialmente desactualizado), cerrando la ventana de carrera.
    const resultado = await db
      .update(usuarios)
      .set({ preguntasIaUsadas: sql`${usuarios.preguntasIaUsadas} + 1` })
      .where(and(eq(usuarios.id, user.id), lt(usuarios.preguntasIaUsadas, 3)))
    if (resultado[0].affectedRows === 0) throw new Error('AI_LIMIT_REACHED')

    const filasUsuario = await db.select().from(usuarios).where(eq(usuarios.id, user.id))
    const usuarioActualizado = filasUsuario.length > 0 ? filasUsuario[0] : null
    if (!usuarioActualizado) throw new Error('AI_LIMIT_REACHED')

    const filasProblema = await db
      .select()
      .from(problemas)
      .where(eq(problemas.id, data.problemaId))
    const problema = filasProblema.length > 0 ? filasProblema[0] : null
    if (!problema) throw new Error('Problema no encontrado')

    const respuesta = await responderPreguntaInvitado({
      descripcionProblema: problema.descripcion,
      pregunta: data.pregunta,
    })

    await db.insert(preguntasIa).values({
      usuarioId: user.id,
      problemaId: data.problemaId,
      pregunta: data.pregunta,
      respuesta,
    })

    return { respuesta, preguntasRestantes: 3 - usuarioActualizado.preguntasIaUsadas }
  })
```

- [ ] **Step 7: Actualizar `src/components/AssistantModal.tsx`** (2 → 3 en todos los textos)

Reemplaza el contenido completo:

```tsx
import { useState } from 'react'
import { preguntarAsistente } from '#/server/functions/assistant'

export function AssistantModal({
  problemaId,
  preguntasUsadas,
  onClose,
}: {
  problemaId: string
  preguntasUsadas: number
  onClose: () => void
}) {
  const [pregunta, setPregunta] = useState('')
  const [turnos, setTurnos] = useState<{ pregunta: string; respuesta: string }[]>([])
  const [restantes, setRestantes] = useState(3 - preguntasUsadas)
  const [preguntando, setPreguntando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAsk() {
    setPreguntando(true)
    try {
      const resultado = await preguntarAsistente({ data: { problemaId, pregunta } })
      setTurnos([...turnos, { pregunta, respuesta: resultado.respuesta }])
      setRestantes(resultado.preguntasRestantes)
      setPregunta('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPreguntando(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="w-96 rounded bg-white p-4">
        <div className="flex justify-between">
          <h2 className="font-bold">Preguntar a Haiku</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <p className="text-sm text-gray-500">
          Preguntas restantes: {restantes}/3
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {turnos.map((t, i) => (
          <div key={i} className="mt-2 text-sm">
            <p className="font-bold">Tú: {t.pregunta}</p>
            <p>Haiku: {t.respuesta}</p>
          </div>
        ))}
        <textarea
          className="mt-2 w-full border p-2"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          disabled={restantes <= 0}
          placeholder="Ej: ¿cómo uso .filter en JavaScript?"
        />
        <button
          className="mt-2 w-full rounded bg-green-600 px-4 py-2 text-white disabled:bg-gray-300"
          onClick={handleAsk}
          disabled={restantes <= 0 || preguntando || !pregunta.trim()}
        >
          {restantes <= 0
            ? 'Ya usaste tus 3 preguntas'
            : preguntando
              ? 'Preguntando...'
              : 'Preguntar'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Actualizar la condición que muestra el botón del asistente**

En `src/routes/problemas/$problemaId.tsx`, cambia:

```tsx
        {user && user.categoria === 'junior' && (
```

por:

```tsx
        {user && user.categoria === 'invitado' && (
```

- [ ] **Step 9: Ejecutar toda la suite de tests**

Run: `npm test`
Expected: PASS (todos los tests, incluyendo los actualizados)

- [ ] **Step 10: Commit**

```bash
git add src/server/assistant/limit.ts tests/assistant-limit.test.ts src/server/claude/assistant.ts src/server/functions/assistant.ts src/components/AssistantModal.tsx src/routes/problemas/\$problemaId.tsx
git commit -m "feat: limitar el asistente de IA a la categoría Invitados (3 preguntas)"
```

---

### Task 8: Grupo de problemas (Invitados+Junior comparten, Senior aparte) y filtrado

**Files:**
- Create: `src/server/problems/grupo.ts`
- Test: `tests/problems-grupo.test.ts`
- Modify: `src/server/problems/validate.ts`
- Modify: `tests/problems-validate.test.ts`
- Modify: `src/server/functions/problems.ts`
- Modify: `src/components/AdminProblemForm.tsx`
- Modify: `src/routes/admin/problemas/$problemaId.tsx`

**Interfaces:**
- Produces: `grupoDeCategoria(categoria: 'invitado' | 'junior' | 'senior'): 'invitado_junior' | 'senior'`.

- [ ] **Step 1: Escribir el test que falla (agrupamiento)**

Crea `tests/problems-grupo.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { grupoDeCategoria } from '../src/server/problems/grupo'

describe('grupoDeCategoria', () => {
  it('invitado y junior comparten el grupo invitado_junior', () => {
    expect(grupoDeCategoria('invitado')).toBe('invitado_junior')
    expect(grupoDeCategoria('junior')).toBe('invitado_junior')
  })

  it('senior tiene su propio grupo', () => {
    expect(grupoDeCategoria('senior')).toBe('senior')
  })
})
```

- [ ] **Step 2: Ejecutar el test y confirmar que falla**

Run: `npm test -- tests/problems-grupo.test.ts`
Expected: FAIL con "Cannot find module '../src/server/problems/grupo'"

- [ ] **Step 3: Implementación mínima**

Crea `src/server/problems/grupo.ts`:

```typescript
export function grupoDeCategoria(
  categoria: 'invitado' | 'junior' | 'senior',
): 'invitado_junior' | 'senior' {
  return categoria === 'senior' ? 'senior' : 'invitado_junior'
}
```

- [ ] **Step 4: Ejecutar el test y confirmar que pasa**

Run: `npm test -- tests/problems-grupo.test.ts`
Expected: PASS

- [ ] **Step 5: Escribir el test que falla (validación de `grupo` requerido)**

Agrega a `tests/problems-validate.test.ts`:

```typescript
  it('reporta cuando falta un grupo válido', () => {
    const errores = validarDatosProblema({
      titulo: 'Two Sum',
      descripcion: 'desc',
      dificultad: 'easy',
      lenguajesPermitidos: ['python'],
      grupo: '' as never,
    })
    expect(errores).toContain('Debe indicar el grupo (invitado_junior o senior)')
  })
```

Y actualiza el primer test (`'passes for a fully filled problem'`) agregando `grupo: 'invitado_junior'` al objeto de entrada.

- [ ] **Step 6: Ejecutar el test y confirmar que falla**

Run: `npm test -- tests/problems-validate.test.ts`
Expected: FAIL — `validarDatosProblema` no reconoce `grupo` como parámetro válido (error de tipos) ni lo valida.

- [ ] **Step 7: Actualizar `src/server/problems/validate.ts`**

Reemplaza el contenido completo:

```typescript
export function validarDatosProblema(input: {
  titulo: string
  descripcion: string
  dificultad: string
  lenguajesPermitidos: string[]
  grupo: 'invitado_junior' | 'senior'
}) {
  const errores: string[] = []
  if (!input.titulo.trim()) errores.push('El título es requerido')
  if (!input.descripcion.trim()) errores.push('La descripción es requerida')
  if (input.lenguajesPermitidos.length === 0) errores.push('Debe permitir al menos un lenguaje')
  if (input.grupo !== 'invitado_junior' && input.grupo !== 'senior')
    errores.push('Debe indicar el grupo (invitado_junior o senior)')
  return errores
}
```

- [ ] **Step 8: Ejecutar el test y confirmar que pasa**

Run: `npm test -- tests/problems-validate.test.ts`
Expected: PASS

- [ ] **Step 9: Filtrar problemas por grupo en `src/server/functions/problems.ts`**

Reemplaza el contenido completo:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { problemas, casosPrueba } from '../db/schema'
import { requerirAdmin, requerirParticipanteIngresado } from '../auth/middleware'
import { validarDatosProblema } from '../problems/validate'
import { grupoDeCategoria } from '../problems/grupo'

type DatosProblema = {
  titulo: string
  descripcion: string
  dificultad: string
  lenguajesPermitidos: string[]
  orden: number
  grupo: 'invitado_junior' | 'senior'
  casosPrueba: { entrada: string; salidaEsperada: string }[]
}

export const listarProblemas = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const user = await requerirParticipanteIngresado(request.headers)
  if (user.rol === 'admin') {
    return db.select().from(problemas).orderBy(problemas.orden)
  }
  const grupo = grupoDeCategoria(user.categoria)
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
      user.rol === 'admin' || filaProblema?.grupo === grupoDeCategoria(user.categoria)
    const problema = filaProblema && puedeVerlo ? filaProblema : null
    const casos = problema
      ? await db.select().from(casosPrueba).where(eq(casosPrueba.problemaId, data))
      : []
    return { problema, casosPrueba: casos }
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
      lenguajesPermitidos: data.lenguajesPermitidos,
      orden: data.orden,
      grupo: data.grupo,
    })

    if (data.casosPrueba.length > 0) {
      await db.insert(casosPrueba).values(
        data.casosPrueba.map((cp) => ({
          problemaId: id,
          entrada: cp.entrada,
          salidaEsperada: cp.salidaEsperada,
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
        lenguajesPermitidos: data.lenguajesPermitidos,
        orden: data.orden,
        grupo: data.grupo,
      })
      .where(eq(problemas.id, data.id))

    await db.delete(casosPrueba).where(eq(casosPrueba.problemaId, data.id))
    if (data.casosPrueba.length > 0) {
      await db.insert(casosPrueba).values(
        data.casosPrueba.map((cp) => ({
          problemaId: data.id,
          entrada: cp.entrada,
          salidaEsperada: cp.salidaEsperada,
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

**Nota (limitación preexistente, no introducida por esta tarea):** `listarProblemas` y `obtenerProblema` ya exigían `requerirParticipanteIngresado` antes de este cambio, lo cual requiere que el usuario tenga `ingresadoEn` no nulo (haya hecho check-in). Si un admin nunca hace check-in como participante, estas llamadas le fallarían igual que antes — este plan no cambia ni corrige ese comportamiento, solo agrega el bypass de `rol === 'admin'` para el filtro de `grupo` específicamente.

- [ ] **Step 10: Agregar el campo `grupo` al formulario de admin**

En `src/components/AdminProblemForm.tsx`, actualiza el tipo `ValorFormularioProblema` agregando `grupo: 'invitado_junior' | 'senior'`, y agrega el campo al formulario. Reemplaza el contenido completo:

```tsx
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
```

- [ ] **Step 11: Propagar `grupo` en la pantalla de edición de admin**

En `src/routes/admin/problemas/$problemaId.tsx`, agrega `grupo` a ambas ramas del objeto `initial`:

```tsx
  const initial: ValorFormularioProblema =
    data && data.problema
      ? {
          titulo: data.problema.titulo,
          descripcion: data.problema.descripcion,
          dificultad: data.problema.dificultad,
          lenguajesPermitidos: data.problema.lenguajesPermitidos,
          orden: data.problema.orden,
          grupo: data.problema.grupo,
          casosPrueba: data.casosPrueba.map((cp) => ({ entrada: cp.entrada, salidaEsperada: cp.salidaEsperada })),
        }
      : {
          titulo: '',
          descripcion: '',
          dificultad: 'easy',
          lenguajesPermitidos: [],
          orden: 0,
          grupo: 'invitado_junior',
          casosPrueba: [],
        }
```

- [ ] **Step 12: Ejecutar toda la suite de tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add src/server/problems/grupo.ts tests/problems-grupo.test.ts src/server/problems/validate.ts tests/problems-validate.test.ts src/server/functions/problems.ts src/components/AdminProblemForm.tsx src/routes/admin/problemas/\$problemaId.tsx
git commit -m "feat: agrupar problemas por invitado_junior/senior y filtrar por categoría"
```

---

### Task 9: Cadencia de hints en Run y feedback exclusivo de Invitados en Submit

**Files:**
- Create: `src/server/judge/hintCadence.ts`
- Test: `tests/hint-cadence.test.ts`
- Modify: `src/server/functions/run.ts`
- Modify: `src/components/RunResults.tsx`
- Modify: `src/routes/problemas/$problemaId.tsx`
- Modify: `src/server/functions/submit.ts`
- Modify: `src/components/SubmitResult.tsx`

**Interfaces:**
- Consumes: `generarComentarioEnvio` (existente, `src/server/claude/feedback.ts`), tabla `corridas` (Task 1).
- Produces: `debeMostrarHint(contador: number): boolean`; `ejecutarCodigo` ahora devuelve `{ resultados, error, hint }`; `SubmitResult` ahora recibe una prop `mostrarFeedback: boolean`.

**Nota de cobertura del spec:** el diseño (sección "Ejecución de código y feedback por categoría") exige que Junior y Senior **nunca** vean contenido generado por IA, ni en Run ni en Submit. Hoy `enviarCodigo` en `submit.ts` llama a `generarComentarioEnvio` para **cualquier** categoría — este task también cierra ese hueco (Steps 7-8), además de la cadencia de hints en Run.

- [ ] **Step 1: Escribir el test que falla**

Crea `tests/hint-cadence.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { debeMostrarHint } from '../src/server/judge/hintCadence'

describe('debeMostrarHint', () => {
  it('no muestra hint en las corridas 1, 2, 4 y 5', () => {
    expect(debeMostrarHint(1)).toBe(false)
    expect(debeMostrarHint(2)).toBe(false)
    expect(debeMostrarHint(4)).toBe(false)
    expect(debeMostrarHint(5)).toBe(false)
  })

  it('muestra hint en las corridas 3, 6 y 9', () => {
    expect(debeMostrarHint(3)).toBe(true)
    expect(debeMostrarHint(6)).toBe(true)
    expect(debeMostrarHint(9)).toBe(true)
  })
})
```

- [ ] **Step 2: Ejecutar el test y confirmar que falla**

Run: `npm test -- tests/hint-cadence.test.ts`
Expected: FAIL con "Cannot find module '../src/server/judge/hintCadence'"

- [ ] **Step 3: Implementación mínima**

Crea `src/server/judge/hintCadence.ts`:

```typescript
export function debeMostrarHint(contador: number): boolean {
  return contador % 3 === 0
}
```

- [ ] **Step 4: Ejecutar el test y confirmar que pasa**

Run: `npm test -- tests/hint-cadence.test.ts`
Expected: PASS

- [ ] **Step 5: Incrementar el contador de corridas y agregar el hint en `ejecutarCodigo`**

Reemplaza el contenido completo de `src/server/functions/run.ts`:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { problemas, casosPrueba, corridas } from '../db/schema'
import { requerirParticipanteIngresado } from '../auth/middleware'
import { ejecutarCasosPrueba } from '../judge/runTestCases'
import { debeMostrarHint } from '../judge/hintCadence'
import { generarComentarioEnvio } from '../claude/feedback'
import type { ResultadoCaso } from '../judge/verdict'

export const ejecutarCodigo = createServerFn({ method: 'POST' })
  .validator((input: { problemaId: string; lenguaje: string; codigo: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<{ resultados: ResultadoCaso[]; error: string | null; hint: string | null }> => {
      const request = getRequest()
      const user = await requerirParticipanteIngresado(request.headers)

      const rows = await db.select().from(problemas).where(eq(problemas.id, data.problemaId))
      const problema = rows.length > 0 ? rows[0] : null
      if (!problema) throw new Error('Problema no encontrado')
      const casos = await db
        .select()
        .from(casosPrueba)
        .where(eq(casosPrueba.problemaId, data.problemaId))

      try {
        const { resultados, veredicto } = await ejecutarCasosPrueba(
          data.lenguaje,
          data.codigo,
          casos.map((c) => ({ entrada: c.entrada, salidaEsperada: c.salidaEsperada })),
        )

        let hint: string | null = null
        if (user.categoria === 'invitado') {
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
            const salidaError = resultados.find((r) => r.salidaError)?.salidaError ?? ''
            hint = await generarComentarioEnvio({
              tituloProblema: problema.titulo,
              descripcionProblema: problema.descripcion,
              codigo: data.codigo,
              veredicto,
              salidaError,
            })
          }
        }

        return { resultados, error: null, hint }
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

- [ ] **Step 6: Mostrar el hint en la UI**

Reemplaza el contenido completo de `src/components/RunResults.tsx`:

```tsx
import type { ResultadoCaso } from '#/server/judge/verdict'

export function RunResults({
  results,
  hint,
}: {
  results: ResultadoCaso[]
  hint: string | null
}) {
  return (
    <div className="mt-4">
      <ul className="flex flex-col gap-2">
        {results.map((r, i) => (
          <li key={i} className={r.aprobado ? 'text-green-600' : 'text-red-600'}>
            {r.aprobado ? '✅' : '❌'} Input: <code>{r.entrada}</code> — Esperado: <code>{r.salidaEsperada}</code> —
            Obtenido: <code>{r.salidaObtenida || r.salidaError}</code>
          </li>
        ))}
      </ul>
      {hint && (
        <p className="mt-2 rounded bg-purple-50 p-2 text-sm text-purple-800">💡 {hint}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Propagar `hint` desde la página del problema**

En `src/routes/problemas/$problemaId.tsx`:

1. Agrega un estado `const [hint, setHint] = useState<string | null>(null)`.
2. En `handleRun`, después de `const { resultados, error } = await ejecutarCodigo(...)`, agrega `setHint(resultado.hint)` (renombra la desestructuración a `const { resultados, error, hint } = await ejecutarCodigo(...)` y usa `setHint(hint)`).
3. Cambia `<RunResults results={resultadosEjecucion} />` por `<RunResults results={resultadosEjecucion} hint={hint} />`.

El bloque `handleRun` completo debe quedar así:

```tsx
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
```

- [ ] **Step 8: Restringir el feedback de Claude en Submit a la categoría Invitados**

En `src/server/functions/submit.ts`, envuelve la llamada existente a `generarComentarioEnvio` (dentro del bloque `try` de `enviarCodigo`) en una condición de categoría. Reemplaza:

```typescript
      await db.update(envios).set({ estado: veredicto }).where(eq(envios.id, envioId))

      generarComentarioEnvio({
        tituloProblema: problema.titulo,
        descripcionProblema: problema.descripcion,
        codigo: data.codigo,
        veredicto,
        salidaError,
      })
        .then((comentario) =>
          db.update(envios).set({ comentarioClaude: comentario }).where(eq(envios.id, envioId)),
        )
        .catch((err: unknown) => console.error('Comentario de Claude falló', err))

      return { envioId, veredicto, error: null }
```

por:

```typescript
      await db.update(envios).set({ estado: veredicto }).where(eq(envios.id, envioId))

      if (user.categoria === 'invitado') {
        generarComentarioEnvio({
          tituloProblema: problema.titulo,
          descripcionProblema: problema.descripcion,
          codigo: data.codigo,
          veredicto,
          salidaError,
        })
          .then((comentario) =>
            db.update(envios).set({ comentarioClaude: comentario }).where(eq(envios.id, envioId)),
          )
          .catch((err: unknown) => console.error('Comentario de Claude falló', err))
      }

      return { envioId, veredicto, error: null }
```

(La variable `user` ya existe en ese handler — es el resultado de `await requerirParticipanteIngresado(request.headers)` al inicio de la función.)

- [ ] **Step 9: Evitar que `SubmitResult` espere un feedback que nunca llegará para Junior/Senior**

Reemplaza el contenido completo de `src/components/SubmitResult.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { obtenerEnvio } from '#/server/functions/submit'

export function SubmitResult({
  envioId,
  veredicto,
  mostrarFeedback,
}: {
  envioId: string
  veredicto: string
  mostrarFeedback: boolean
}) {
  const [comentario, setComentario] = useState<string | null>(null)

  useEffect(() => {
    if (!mostrarFeedback) return
    let cancelado = false
    const interval = setInterval(() => {
      obtenerEnvio({ data: envioId })
        .then((envio) => {
          if (!cancelado && envio?.comentarioClaude) {
            setComentario(envio.comentarioClaude)
            clearInterval(interval)
          }
        })
        .catch((err: unknown) => console.error('No se pudo consultar el envío', err))
    }, 2000)
    return () => {
      cancelado = true
      clearInterval(interval)
    }
  }, [envioId, mostrarFeedback])

  return (
    <div className="mt-4 rounded border p-4">
      <p className="font-bold">Veredicto: {veredicto}</p>
      {mostrarFeedback && (
        <p className="mt-2 text-sm text-gray-600">{comentario ?? 'Generando feedback...'}</p>
      )}
    </div>
  )
}
```

En `src/routes/problemas/$problemaId.tsx`, cambia:

```tsx
          <SubmitResult envioId={resultadoEnvio.envioId} veredicto={resultadoEnvio.veredicto} />
```

por:

```tsx
          <SubmitResult
            envioId={resultadoEnvio.envioId}
            veredicto={resultadoEnvio.veredicto}
            mostrarFeedback={user?.categoria === 'invitado'}
          />
```

- [ ] **Step 10: Ejecutar toda la suite de tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add src/server/judge/hintCadence.ts tests/hint-cadence.test.ts src/server/functions/run.ts src/components/RunResults.tsx src/routes/problemas/\$problemaId.tsx src/server/functions/submit.ts src/components/SubmitResult.tsx
git commit -m "feat: agregar hints de Haiku cada 3 corridas en Run y limitar el feedback de Submit a Invitados"
```

---

### Task 10: Leaderboard de 3 categorías

**Files:**
- Modify: `src/server/standings/calculate.ts`
- Modify: `tests/standings.test.ts`
- Modify: `src/server/functions/leaderboard.ts`
- Modify: `src/routes/clasificacion.tsx`

**Interfaces:**
- Produces: `RegistroUsuario.categoria` y `FilaClasificacion.categoria` ahora `'invitado' | 'junior' | 'senior'`; `agruparClasificacionPorCategoria` devuelve `{ invitado, junior, senior }`.

- [ ] **Step 1: Actualizar los tests existentes de standings**

En `tests/standings.test.ts`, reemplaza el `describe('agruparClasificacionPorCategoria', ...)` (al final del archivo) por:

```typescript
describe('agruparClasificacionPorCategoria', () => {
  it('separa las filas en invitado, junior y senior', () => {
    const agrupado = agruparClasificacionPorCategoria([
      { usuarioId: 'u1', nombre: 'Ana', categoria: 'senior', cantidadResueltos: 1, minutosPenalizacionTotal: 5 },
      { usuarioId: 'u2', nombre: 'Beto', categoria: 'junior', cantidadResueltos: 0, minutosPenalizacionTotal: 0 },
      { usuarioId: 'u3', nombre: 'Cata', categoria: 'invitado', cantidadResueltos: 0, minutosPenalizacionTotal: 0 },
    ])
    expect(agrupado.senior.map((f) => f.usuarioId)).toEqual(['u1'])
    expect(agrupado.junior.map((f) => f.usuarioId)).toEqual(['u2'])
    expect(agrupado.invitado.map((f) => f.usuarioId)).toEqual(['u3'])
  })
})
```

(Los demás tests del archivo usan `categoria: 'senior'` o `'junior'`, que siguen siendo valores válidos — no necesitan cambios.)

- [ ] **Step 2: Ejecutar el test y confirmar que falla**

Run: `npm test -- tests/standings.test.ts`
Expected: FAIL — `agrupado.invitado` es `undefined`.

- [ ] **Step 3: Actualizar `src/server/standings/calculate.ts`**

Reemplaza las líneas de tipos y la función `agruparClasificacionPorCategoria` (deja `calcularClasificacion` intacta, solo cambian los tipos que usa):

```typescript
export type RegistroUsuario = {
  id: string
  nombre: string
  categoria: 'invitado' | 'junior' | 'senior'
}

export type FilaClasificacion = {
  usuarioId: string
  nombre: string
  categoria: 'invitado' | 'junior' | 'senior'
  cantidadResueltos: number
  minutosPenalizacionTotal: number
}
```

Y al final del archivo, reemplaza:

```typescript
export function agruparClasificacionPorCategoria(filas: FilaClasificacion[]) {
  return {
    invitado: filas.filter((f) => f.categoria === 'invitado'),
    junior: filas.filter((f) => f.categoria === 'junior'),
    senior: filas.filter((f) => f.categoria === 'senior'),
  }
}
```

- [ ] **Step 4: Ejecutar el test y confirmar que pasa**

Run: `npm test -- tests/standings.test.ts`
Expected: PASS

- [ ] **Step 5: Actualizar `src/server/functions/leaderboard.ts`**

Reemplaza el contenido completo:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { usuarios, envios, estadoTorneo } from '../db/schema'
import { calcularClasificacion, agruparClasificacionPorCategoria } from '../standings/calculate'
import type { RegistroUsuario } from '../standings/calculate'

export const obtenerClasificacion = createServerFn({ method: 'GET' }).handler(async () => {
  const filasEstado = await db.select().from(estadoTorneo).where(eq(estadoTorneo.id, 1))
  const estado = filasEstado.length > 0 ? filasEstado[0] : null
  if (!estado?.iniciadoEn) {
    return { iniciado: false as const, invitado: [], junior: [], senior: [] }
  }

  const todosUsuarios = await db.select().from(usuarios)
  const todosEnvios = await db.select().from(envios)

  const usuariosElegibles: Array<RegistroUsuario> = todosUsuarios
    .filter((u) => u.rol === 'participante')
    .map((u) => ({ id: u.id, nombre: u.name, categoria: u.categoria }))

  const filas = calcularClasificacion(
    usuariosElegibles,
    todosEnvios.map((e) => ({
      usuarioId: e.usuarioId,
      problemaId: e.problemaId,
      estado: e.estado,
      creadoEn: e.creadoEn,
    })),
    estado.iniciadoEn,
  )
  const agrupado = agruparClasificacionPorCategoria(filas)
  return { iniciado: true as const, ...agrupado }
})
```

(Antes, `todosUsuarios` se filtraba por `categoria !== null` porque `categoria` era opcional; ahora es NOT NULL, así que el filtro relevante es excluir cuentas `admin` de la clasificación.)

- [ ] **Step 6: Agregar la tercera tabla en `src/routes/clasificacion.tsx`**

Reemplaza el `return` del componente `LeaderboardPage`:

```tsx
  return (
    <div className="grid grid-cols-3 gap-8 p-8">
      <LeaderboardTable title="Invitados" rows={data.invitado} />
      <LeaderboardTable title="Junior" rows={data.junior} />
      <LeaderboardTable title="Senior" rows={data.senior} />
    </div>
  )
```

- [ ] **Step 7: Ejecutar toda la suite de tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/server/standings/calculate.ts tests/standings.test.ts src/server/functions/leaderboard.ts src/routes/clasificacion.tsx
git commit -m "feat: agregar la categoría Invitados al leaderboard (3 tablas)"
```

---

### Task 11: Eliminar la autoselección de categoría

**Files:**
- Delete: `src/routes/registro.tsx`
- Delete: `src/server/auth/category.ts`
- Delete: `tests/category.test.ts`
- Modify: `src/server/functions/auth.ts`

**Interfaces:**
- Ninguna (solo elimina código muerto).

- [ ] **Step 1: Confirmar que nada más referencia estos archivos**

Run: `grep -rn "establecerCategoria\|asegurarCategoriaNoDefinida\|routes/registro" src tests --include="*.ts" --include="*.tsx"`
Expected: solo coincidencias dentro de los archivos que se van a borrar/editar en este task (`src/routes/registro.tsx`, `src/server/auth/category.ts`, `tests/category.test.ts`, `src/server/functions/auth.ts`). Si aparece algo más, detente y revisa esa referencia antes de continuar.

- [ ] **Step 2: Eliminar los archivos**

```bash
git rm src/routes/registro.tsx src/server/auth/category.ts tests/category.test.ts
```

- [ ] **Step 3: Limpiar `src/server/functions/auth.ts`**

Reemplaza el contenido completo:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { requerirUsuario } from '../auth/middleware'

export const obtenerUsuarioActual = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  return requerirUsuario(request.headers)
})
```

- [ ] **Step 4: Regenerar el árbol de rutas de TanStack Router**

Run: `npm run generate-routes`
Expected: `src/routeTree.gen.ts` se actualiza sin la ruta `/registro`, sin errores.

- [ ] **Step 5: Ejecutar toda la suite de tests y el type-check**

Run: `npm test`
Expected: PASS (sin los tests de `category.test.ts`, que ya no existen)

Run: `npx tsc --noEmit`
Expected: sin errores

- [ ] **Step 6: Commit**

```bash
git add -A src/routes/registro.tsx src/server/auth/category.ts tests/category.test.ts src/server/functions/auth.ts src/routeTree.gen.ts
git commit -m "fix: eliminar la autoselección de categoría, ahora la asigna el admin"
```

---

## Seguimientos pendientes (no bloquean el fin de este plan, pero hay que resolverlos antes del evento)

- Verificar en vivo el login por correo/contraseña (`authClient.signIn.email`) contra un servidor de desarrollo real — no se pudo probar en este entorno sin navegador.
- Verificar en vivo la pantalla `/admin/participantes`: registrar una persona real, confirmar que llega el correo de Brevo (o que el aviso de contraseña visible funciona si falla), y que puede iniciar sesión con esas credenciales.
- Conseguir una cuenta de Brevo real y configurar `BREVO_API_KEY`/`BREVO_CORREO_REMITENTE` en producción (Railway).
- Decidir y documentar el valor de `categoria` a usar para las cuentas `admin` creadas manualmente en la base de datos (ver nota en Task 1).
- No hay enlaces de navegación entre las pantallas de admin (`/admin/participantes`, `/admin/torneo`, `/admin/problemas`, `/admin/ingreso`, `/admin/envios`) — esto ya era así antes de este plan; considerar agregar un menú si se vuelve molesto de usar durante el evento.
