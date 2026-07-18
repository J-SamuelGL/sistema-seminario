# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Torneo de Programación" — a TanStack Start (React 19, SSR) app for running a live competitive-programming
tournament/seminar. Participants log in, get checked in via QR, solve problems by submitting code in one of
five languages, get graded against test cases executed through a sandboxed Piston instance, and appear on a
live leaderboard. An "invitado" (guest) category gets Claude-generated hints/feedback; other categories don't.

**All code, identifiers, DB columns/tables, commit messages, and branch names are in Spanish.** Follow this
convention for any new code — don't switch to English identifiers.

## Commands

```bash
npm run dev            # start dev server on :3000
npm run build           # production build
npm run start           # run production build (used by Railway)
npm run test             # vitest run (all tests, tests/**/*.test.ts)
npx vitest run tests/judge.test.ts   # run a single test file
npm run lint             # eslint
npm run format            # prettier --write . && eslint --fix
npm run check             # prettier --check .
npm run generate-routes    # regenerate src/routeTree.gen.ts (tsr generate) — usually automatic via the vite plugin
```

Tests run against a real MySQL and a real Piston instance for the harness/judge tests (see `tests/harness-*.test.ts`,
`tests/judge.test.ts`, `tests/piston-*.test.ts`) — `DATABASE_URL` and `PISTON_URL` must point to running local
services (`.env` is loaded via `dotenv/config` in `vitest.config.ts`). Do not test UI behavior via browser
automation — the user drives that manually.

## Architecture

### Grading pipeline (the core of the app)

Submitted code is never `eval`'d directly — it's wrapped into a full program and shipped to an external
[Piston](https://github.com/engineer-man/piston) execution service (`PISTON_URL`, default
`http://localhost:2000`) over HTTP. Flow, per test case:

1. `src/server/judge/harness/*.ts` — one file per supported language (`python`, `javascript`, `java`, `csharp`,
   `php`), each exporting a `generarPrograma*` function that renders the participant's function body plus a
   small driver that calls it with the case's arguments and prints a canonical stdout representation.
   `harness/index.ts` dispatches by language name.
2. `src/server/piston/client.ts` (`ejecutarPiston`) — POSTs the generated program to Piston's
   `/api/v2/execute`, with a **5000ms `run_timeout`** (Piston's server-side must be configured with
   `PISTON_RUN_TIMEOUT=5000` or greater, or every submission is rejected — see `docs/deployment.md`).
   `src/server/piston/languages.ts` maps our language names to Piston's `language`/`version` pairs; the code
   comment there documents a real gotcha: the _install-time package name_ differs from the _execution-time
   language alias_ for `javascript` (package `node`) and `csharp` (package `mono`).
3. `src/server/judge/serializar.ts` — serializes expected output to a canonical string per return type and
   compares it against actual stdout (`compararSalidas`); float comparison is tolerant, not exact-string.
4. `src/server/judge/verdict.ts` (`determinarVeredicto`) — reduces all per-case results to one of `aceptado`,
   `respuesta_incorrecta`, `error_ejecucion`, `tiempo_excedido`.
5. `src/server/judge/runTestCases.ts` (`ejecutarCasosPrueba`) orchestrates 1–4 across all test cases for one
   submission.
6. `src/server/judge/resultadoPublico.ts` strips hidden-test-case detail (`ocultarDetalleCasosNoVisibles`)
   before results go back to the client — hidden cases exist so participants can't read expected output by
   inspecting network responses.

Type system for problem I/O lives in `src/server/judge/tipos.ts` (`TipoDato` = scalar or `list<scalar>`,
`Valor`, `Parametro`) and is shared between the DB schema (`problemas.parametros`/`tipoRetorno` JSON columns),
the harness generators, and admin-side problem validation (`src/server/problems/validate.ts`).

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
que el torneo termina. Gotcha de Drizzle/MySQL: un `.onDuplicateKeyUpdate({ set: {} })` produce SQL inválido
(MySQL no acepta un `SET` vacío) — el no-op correcto es autoreferenciar una columna sin cambiarla, p.ej.
`set: { usuarioId: sql\`usuario_id\` }`.

### Claude integration

Two independent call sites, both via `@anthropic-ai/sdk` directly (no framework), both `claude-haiku-4-5`,
both `invitado`-category-only:

- `src/server/claude/assistant.ts` — free-form syntax-help chat widget (`AssistantModal.tsx`). Receives
  título+descripción of every problem in the participant's group (`invitado_junior`/`senior`), not just the
  one currently open, and is system-prompted to refuse revealing the solution to any of them. Usage is
  rate-limited per user via `src/server/assistant/limit.ts` and `usuario.preguntasIaUsadas`.
- `src/server/claude/feedback.ts` — comentario/hint periódico cada 3 corridas de `Run`
  (`src/server/judge/hintCadence.ts`), basado en veredicto + stderr. Ya no se genera al enviar una
  respuesta (no existe ese flujo).

### Auth & authorization

better-auth (`src/server/auth/auth.ts`) with the Drizzle MySQL adapter, mapped onto Spanish-named tables
(`usuarios`, `sesiones`, `cuentas`, `verificaciones`). Email+password only, `disableSignUp: true` — accounts
are provisioned by an admin from `/admin/participantes` (see `src/server/participantes/crear.ts`), not via
self-registration; credentials are emailed through Brevo (`src/server/email/brevo.ts`) with an admin-UI
fallback if delivery fails. Authorization is layered, not role-based middleware — each server function calls
one of `src/server/auth/middleware.ts`'s helpers explicitly:

- `requerirUsuario` — any logged-in user
- `requerirAdmin` — `usuario.rol === 'admin'`
- `requerirParticipanteIngresado` — logged in **and** checked in (`usuario.ingresadoEn` set via the QR
  check-in flow, `src/server/checkin/`)

Admin accounts are seeded directly in the DB (not through the app); `usuario.categoria` is `NOT NULL` even for
admins, where it's semantically meaningless — use `'senior'` as the placeholder (see `docs/deployment.md`).

Route-level `beforeLoad` guards (`src/routes/_app/route.tsx`, `src/routes/admin/route.tsx`) redirect
unauthenticated users to `/` and non-admins away from `/admin` to `/perfil` — this is a UX-level layer only,
distinct from the server-function checks above; it does not itself authorize anything, so every server
function under a guarded route must still call the appropriate `requerir*` helper on its own.

### Tournament lifecycle & scoring

Single-row `estado_torneo` table (id fixed at 1) gates whether submissions are accepted
(`src/server/tournament/guard.ts`: `asegurarIniciado`/`asegurarNoIniciado`). Once started, it cannot be
un-started. `src/server/standings/calculate.ts` computes the leaderboard: a problem counts as solved when its
`envio` has `estadoProgreso` `completado` (auto-detected by `Run`) or `aprobado_manual` (set by an
admin from `/admin/respuestas`); points come from the first (and only) such `envio` per problem per
user, with a penalty in minutes equal to the minutes since tournament start at the time it was
solved (no penalty for prior failed attempts). `src/server/standings/duracion.ts` computes, for the
admin-facing detail page, how long a participant took on each solved problem (relative to the
previous solve, or tournament start for the first one). Ranking is by total
points desc, then penalty asc — not by count of problems solved. `agruparClasificacionPorCategoria` splits
results into `invitado`/`junior`/`senior` boards.

Problems are grouped into `invitado_junior` vs `senior` (`problemas.grupo`) for visibility filtering — invitado
and junior participants see the same problem set, senior a different one.

### Routing & data layer

TanStack Start file-based routing (`src/routes/`, generated `routeTree.gen.ts` — don't hand-edit). Server-side
logic lives exclusively under `src/server/`, exposed to routes/components via `createServerFn` wrappers in
`src/server/functions/*.ts` (one file per domain area: `auth`, `checkin`, `leaderboard`, `participantes`,
`problems`, `run`, `submit`, `tournament`, `admin-submissions`). Route components call these directly; there is
no separate REST/tRPC layer. DB access is Drizzle ORM against MySQL (`src/server/db/schema.ts` /
`src/server/db/client.ts`); migrations are managed by `drizzle-kit` (`drizzle.config.ts`), pushed via
`npx drizzle-kit push` (see deploy doc) rather than a checked-in migrations flow.

Path alias: both `#/*` and `@/*` map to `./src/*` (see `tsconfig.json` / `package.json#imports`).

**`src/server/functions/*.ts` must export ONLY `createServerFn` values.** These files are imported by
client code, and the compiler only stubs out server-function exports — a plain `export function`
keeps its real body (and its `db/client` → mysql2 import chain) in the browser bundle, which crashes
production with `Cannot read properties of undefined (reading 'prototype')` (safer-buffer touching
`Buffer` in the browser). Shared helpers go in plain server modules (`standings/`, `envios/`, etc.)
and get imported by the function files, never re-exported from them. Enforced by
`tests/funciones-solo-server-fn.test.ts`.

### Local dev dependencies

The app expects a local MySQL (`DATABASE_URL`) and a local Piston instance (`PISTON_URL`, defaults to
`localhost:2000`) — Piston is not bundled; run it separately (e.g. via its Docker image) and install language
runtimes with `scripts/install-piston-languages.sh <piston-url>` before grading will work for a given language.
`scripts/seed-datos-prueba.ts` seeds local test data.

## Design docs

`docs/superpowers/specs/` and `docs/superpowers/plans/` hold the original spec/plan pairs for each major
feature (tournament core, categories/manual registration, multi-language grading engine) — useful background
for _why_ something is shaped the way it is, but the code is authoritative for current behavior.
