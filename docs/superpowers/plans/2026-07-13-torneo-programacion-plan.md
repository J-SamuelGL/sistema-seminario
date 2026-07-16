# Torneo de Programación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a LeetCode-style programming tournament platform (problem panel + code editor + judge + live leaderboard + junior AI assistant) with TanStack Start, deployed to Railway.

**Architecture:** Single TanStack Start app (frontend + server functions) backed by Postgres (Drizzle ORM), a self-hosted Piston service for sandboxed code execution, and the Anthropic API for post-verdict feedback and the junior-only syntax assistant.

**Tech Stack:** TanStack Start (React + TanStack Router), Drizzle ORM + Postgres, Better Auth (Google/GitHub OAuth), Piston (code execution), `@anthropic-ai/sdk` (Claude Haiku 4.5), `@monaco-editor/react`, `qrcode` + `html5-qrcode`, Tailwind CSS, Vitest.

## Global Constraints

- Node.js 20 LTS, npm as package manager.
- TypeScript strict mode enabled everywhere.
- App root directory: `src/` (`src/routes`, `src/server`, `src/components`).
- Testing: Vitest, run via `npm test` (`vitest run`).
- Styling: Tailwind CSS.
- Server-only secrets (`DATABASE_URL`, `ANTHROPIC_API_KEY`, OAuth client secrets, `PISTON_URL`) are read via `process.env` only in `src/server/**`, never imported into client components.
- Standings penalty rule (fixed by spec): +20 minutes per failed attempt before the accepted one, per problem (ICPC-style).
- Junior AI assistant limit (fixed by spec): 2 questions total per participant for the entire tournament, not per problem.
- Test cases are always fully visible to participants — no hidden test cases.
- Claude model for both submission feedback and the junior assistant: `claude-haiku-4-5`.
- Spec reference: `docs/superpowers/specs/2026-07-13-torneo-programacion-design.md`.

---

## Task 1: Project Scaffolding

**Files:**

- Create: entire project via CLI (`src/routes/__root.tsx`, `src/routes/index.tsx`, `src/router.tsx`, `vite.config.ts`, `package.json`, `tailwind.config.ts`)
- Create: `vitest.config.ts`

**Interfaces:**

- Produces: a running TanStack Start dev server, Tailwind wired up, `npm test` running Vitest.

- [ ] **Step 1: Scaffold the app**

```bash
npx create-tsrouter-app@latest sistema-seminario --framework react --add-on start --tailwind
cd sistema-seminario
```

- [ ] **Step 2: Verify dev server**

Run: `npm run dev`
Expected: server starts, opening the printed localhost URL shows the default starter page with no console errors.

- [ ] **Step 3: Install testing tooling**

```bash
npm install -D vitest
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 4: Write a smoke test to confirm the test runner works**

Create `tests/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 6: Replace default landing copy**

Modify `src/routes/index.tsx` so the page renders an `<h1>` with text `Torneo de Programación`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold TanStack Start app with Tailwind and Vitest"
```

---

## Task 2: Database Schema & Connection

**Files:**

- Create: `src/server/db/schema.ts`
- Create: `src/server/db/client.ts`
- Create: `drizzle.config.ts`
- Create: `.env.example`
- Test: `tests/db.test.ts`

**Interfaces:**

- Produces: Drizzle table objects `users, sessions, accounts, verifications, problems, testCases, submissions, aiQuestions, tournamentState` (exported from `src/server/db/schema.ts`), and `db` client (exported from `src/server/db/client.ts`).
- Consumes: nothing (foundation layer).

- [ ] **Step 1: Install dependencies**

```bash
npm install drizzle-orm pg dotenv
npm install -D drizzle-kit @types/pg
```

- [ ] **Step 2: Start a local Postgres for development**

```bash
docker run --name torneo-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=torneo -p 5432:5432 -d postgres:16
```

- [ ] **Step 3: Create `.env.example` and `.env`**

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/torneo
ANTHROPIC_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
BETTER_AUTH_SECRET=
PISTON_URL=http://localhost:2000
```

Copy `.env.example` to `.env` and fill in `DATABASE_URL` for local dev (the rest are filled in later tasks).

- [ ] **Step 4: Write the schema**

Create `src/server/db/schema.ts`:

```ts
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['participant', 'admin'])
export const categoryEnum = pgEnum('category', ['senior', 'junior'])
export const submissionStatusEnum = pgEnum('submission_status', [
  'pending',
  'accepted',
  'wrong_answer',
  'runtime_error',
  'timeout',
])

// Better Auth core tables
export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  role: roleEnum('role').notNull().default('participant'),
  category: categoryEnum('category'),
  checkinToken: text('checkin_token').defaultRandom().notNull().unique(),
  checkedInAt: timestamp('checked_in_at'),
  aiQuestionsUsed: integer('ai_questions_used').notNull().default(0),
})

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
})

export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  idToken: text('id_token'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Domain tables
export const problems = pgTable('problems', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  description: text('description').notNull(),
  difficulty: text('difficulty').notNull(),
  allowedLanguages: text('allowed_languages').array().notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const testCases = pgTable('test_cases', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  problemId: text('problem_id')
    .notNull()
    .references(() => problems.id, { onDelete: 'cascade' }),
  input: text('input').notNull(),
  expectedOutput: text('expected_output').notNull(),
})

export const submissions = pgTable('submissions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  problemId: text('problem_id')
    .notNull()
    .references(() => problems.id),
  code: text('code').notNull(),
  language: text('language').notNull(),
  status: submissionStatusEnum('status').notNull().default('pending'),
  claudeFeedback: text('claude_feedback'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const aiQuestions = pgTable('ai_questions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  problemId: text('problem_id').references(() => problems.id),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const tournamentState = pgTable('tournament_state', {
  id: integer('id').primaryKey().default(1),
  startedAt: timestamp('started_at'),
})
```

- [ ] **Step 5: Create the Drizzle client**

Create `src/server/db/client.ts`:

```ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool, { schema })
```

- [ ] **Step 6: Create the Drizzle Kit config**

Create `drizzle.config.ts`:

```ts
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

- [ ] **Step 7: Push schema to the local database**

Run: `npx drizzle-kit push`
Expected: CLI reports tables created (`user`, `session`, `account`, `verification`, `problems`, `test_cases`, `submissions`, `ai_questions`, `tournament_state`).

- [ ] **Step 8: Write connection test**

Create `tests/db.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { db } from '../src/server/db/client'
import { tournamentState } from '../src/server/db/schema'
import { eq } from 'drizzle-orm'

describe('database connection', () => {
  it('can insert and read tournament_state', async () => {
    await db.insert(tournamentState).values({ id: 1 }).onConflictDoNothing()
    const rows = await db
      .select()
      .from(tournamentState)
      .where(eq(tournamentState.id, 1))
    expect(rows.length).toBe(1)
  })
})
```

- [ ] **Step 9: Run test**

Run: `npm test`
Expected: PASS (requires local Postgres running from Step 2, `.env` loaded — install `dotenv/config` import at the top of `vitest.config.ts` if env vars aren't picked up automatically).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add Drizzle schema and Postgres connection"
```

---

## Task 3: Standings Calculation (pure logic)

**Files:**

- Create: `src/server/standings/calculate.ts`
- Test: `tests/standings.test.ts`

**Interfaces:**

- Produces: `calculateStandings(users, submissions, tournamentStartedAt): StandingRow[]` and `groupStandingsByCategory(rows): { senior: StandingRow[]; junior: StandingRow[] }`, used by Task 13 (Leaderboard).
- Consumes: nothing (pure function, no DB/network).

- [ ] **Step 1: Write failing tests**

Create `tests/standings.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  calculateStandings,
  groupStandingsByCategory,
} from '../src/server/standings/calculate'

const start = new Date('2026-07-13T10:00:00Z')

describe('calculateStandings', () => {
  it('returns zero solved for a user with no submissions', () => {
    const rows = calculateStandings(
      [{ id: 'u1', name: 'Ana', category: 'senior' }],
      [],
      start,
    )
    expect(rows).toEqual([
      {
        userId: 'u1',
        name: 'Ana',
        category: 'senior',
        solvedCount: 0,
        totalPenaltyMinutes: 0,
      },
    ])
  })

  it('counts an accepted submission as solved with time-based penalty', () => {
    const rows = calculateStandings(
      [{ id: 'u1', name: 'Ana', category: 'senior' }],
      [
        {
          userId: 'u1',
          problemId: 'p1',
          status: 'accepted',
          createdAt: new Date('2026-07-13T10:10:00Z'),
        },
      ],
      start,
    )
    expect(rows[0].solvedCount).toBe(1)
    expect(rows[0].totalPenaltyMinutes).toBe(10)
  })

  it('adds 20 minutes penalty per failed attempt before the accepted one', () => {
    const rows = calculateStandings(
      [{ id: 'u1', name: 'Ana', category: 'senior' }],
      [
        {
          userId: 'u1',
          problemId: 'p1',
          status: 'wrong_answer',
          createdAt: new Date('2026-07-13T10:02:00Z'),
        },
        {
          userId: 'u1',
          problemId: 'p1',
          status: 'wrong_answer',
          createdAt: new Date('2026-07-13T10:05:00Z'),
        },
        {
          userId: 'u1',
          problemId: 'p1',
          status: 'accepted',
          createdAt: new Date('2026-07-13T10:10:00Z'),
        },
      ],
      start,
    )
    expect(rows[0].solvedCount).toBe(1)
    expect(rows[0].totalPenaltyMinutes).toBe(10 + 20 * 2)
  })

  it('does not count a problem with no accepted submission as solved', () => {
    const rows = calculateStandings(
      [{ id: 'u1', name: 'Ana', category: 'senior' }],
      [
        {
          userId: 'u1',
          problemId: 'p1',
          status: 'wrong_answer',
          createdAt: new Date('2026-07-13T10:05:00Z'),
        },
      ],
      start,
    )
    expect(rows[0].solvedCount).toBe(0)
    expect(rows[0].totalPenaltyMinutes).toBe(0)
  })

  it('sorts by solved count desc, then penalty asc', () => {
    const rows = calculateStandings(
      [
        { id: 'u1', name: 'Ana', category: 'senior' },
        { id: 'u2', name: 'Beto', category: 'senior' },
      ],
      [
        {
          userId: 'u1',
          problemId: 'p1',
          status: 'accepted',
          createdAt: new Date('2026-07-13T10:30:00Z'),
        },
        {
          userId: 'u2',
          problemId: 'p1',
          status: 'accepted',
          createdAt: new Date('2026-07-13T10:05:00Z'),
        },
        {
          userId: 'u2',
          problemId: 'p2',
          status: 'accepted',
          createdAt: new Date('2026-07-13T10:20:00Z'),
        },
      ],
      start,
    )
    expect(rows.map((r) => r.userId)).toEqual(['u2', 'u1'])
  })

  it('ignores pending submissions', () => {
    const rows = calculateStandings(
      [{ id: 'u1', name: 'Ana', category: 'junior' }],
      [
        {
          userId: 'u1',
          problemId: 'p1',
          status: 'pending',
          createdAt: new Date('2026-07-13T10:05:00Z'),
        },
      ],
      start,
    )
    expect(rows[0].solvedCount).toBe(0)
  })
})

describe('groupStandingsByCategory', () => {
  it('splits rows into senior and junior lists', () => {
    const grouped = groupStandingsByCategory([
      {
        userId: 'u1',
        name: 'Ana',
        category: 'senior',
        solvedCount: 1,
        totalPenaltyMinutes: 5,
      },
      {
        userId: 'u2',
        name: 'Beto',
        category: 'junior',
        solvedCount: 0,
        totalPenaltyMinutes: 0,
      },
    ])
    expect(grouped.senior.map((r) => r.userId)).toEqual(['u1'])
    expect(grouped.junior.map((r) => r.userId)).toEqual(['u2'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- standings`
Expected: FAIL with "Cannot find module '../src/server/standings/calculate'".

- [ ] **Step 3: Implement**

Create `src/server/standings/calculate.ts`:

```ts
export type SubmissionRecord = {
  userId: string
  problemId: string
  status: 'pending' | 'accepted' | 'wrong_answer' | 'runtime_error' | 'timeout'
  createdAt: Date
}

export type UserRecord = {
  id: string
  name: string
  category: 'senior' | 'junior'
}

export type StandingRow = {
  userId: string
  name: string
  category: 'senior' | 'junior'
  solvedCount: number
  totalPenaltyMinutes: number
}

export function calculateStandings(
  users: UserRecord[],
  submissions: SubmissionRecord[],
  tournamentStartedAt: Date,
): StandingRow[] {
  const byUser = new Map<string, SubmissionRecord[]>()
  for (const s of submissions) {
    if (s.status === 'pending') continue
    if (!byUser.has(s.userId)) byUser.set(s.userId, [])
    byUser.get(s.userId)!.push(s)
  }

  const rows = users.map((user): StandingRow => {
    const subs = (byUser.get(user.id) ?? [])
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    const byProblem = new Map<string, SubmissionRecord[]>()
    for (const s of subs) {
      if (!byProblem.has(s.problemId)) byProblem.set(s.problemId, [])
      byProblem.get(s.problemId)!.push(s)
    }

    let solvedCount = 0
    let totalPenaltyMinutes = 0

    for (const [, problemSubs] of byProblem) {
      const acceptedIndex = problemSubs.findIndex(
        (s) => s.status === 'accepted',
      )
      if (acceptedIndex === -1) continue
      solvedCount += 1
      const acceptedSubmission = problemSubs[acceptedIndex]
      const failedAttemptsBefore = acceptedIndex
      const minutesSinceStart =
        (acceptedSubmission.createdAt.getTime() -
          tournamentStartedAt.getTime()) /
        60000
      totalPenaltyMinutes += minutesSinceStart + failedAttemptsBefore * 20
    }

    return {
      userId: user.id,
      name: user.name,
      category: user.category,
      solvedCount,
      totalPenaltyMinutes,
    }
  })

  return rows.sort((a, b) => {
    if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount
    return a.totalPenaltyMinutes - b.totalPenaltyMinutes
  })
}

export function groupStandingsByCategory(rows: StandingRow[]) {
  return {
    senior: rows.filter((r) => r.category === 'senior'),
    junior: rows.filter((r) => r.category === 'junior'),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- standings`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add pure standings calculation with ICPC-style penalty"
```

---

## Task 4: Piston Client Wrapper

**Files:**

- Create: `src/server/piston/languages.ts`
- Create: `src/server/piston/client.ts`
- Test: `tests/piston-client.test.ts`

**Interfaces:**

- Produces: `pistonExecute(language, code, stdin): Promise<PistonResult>` where `PistonResult = { stdout, stderr, exitCode, timedOut }`. Used by Task 5 (judge).
- Consumes: `process.env.PISTON_URL`, global `fetch`.

- [ ] **Step 1: Write failing test**

Create `tests/piston-client.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pistonExecute } from '../src/server/piston/client'

describe('pistonExecute', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends the mapped language/version and parses stdout', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        run: { stdout: 'hi\n', stderr: '', code: 0, signal: null },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await pistonExecute('python', 'print("hi")', '')

    expect(result).toEqual({
      stdout: 'hi\n',
      stderr: '',
      exitCode: 0,
      timedOut: false,
    })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v2/execute')
    const body = JSON.parse(options.body)
    expect(body.language).toBe('python')
    expect(body.files[0].content).toBe('print("hi")')
  })

  it('marks timedOut when Piston reports SIGKILL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          run: { stdout: '', stderr: '', code: 1, signal: 'SIGKILL' },
        }),
      }),
    )
    const result = await pistonExecute('python', 'while True: pass', '')
    expect(result.timedOut).toBe(true)
  })

  it('throws for an unsupported language', async () => {
    await expect(pistonExecute('cobol', 'x', '')).rejects.toThrow(
      'Unsupported language: cobol',
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- piston-client`
Expected: FAIL with "Cannot find module '../src/server/piston/client'".

- [ ] **Step 3: Implement language mapping**

Create `src/server/piston/languages.ts`:

```ts
export const LANGUAGE_MAP: Record<
  string,
  { language: string; version: string }
> = {
  python: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
}
```

- [ ] **Step 4: Implement the client**

Create `src/server/piston/client.ts`:

```ts
import { LANGUAGE_MAP } from './languages'

export type PistonResult = {
  stdout: string
  stderr: string
  exitCode: number
  timedOut: boolean
}

export async function pistonExecute(
  language: string,
  code: string,
  stdin: string,
): Promise<PistonResult> {
  const mapping = LANGUAGE_MAP[language]
  if (!mapping) {
    throw new Error(`Unsupported language: ${language}`)
  }

  const pistonUrl = process.env.PISTON_URL ?? 'http://localhost:2000'
  const response = await fetch(`${pistonUrl}/api/v2/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: mapping.language,
      version: mapping.version,
      files: [{ content: code }],
      stdin,
      run_timeout: 5000,
    }),
  })

  if (!response.ok) {
    throw new Error(`Piston request failed: ${response.status}`)
  }

  const data = await response.json()
  const run = data.run
  return {
    stdout: run.stdout ?? '',
    stderr: run.stderr ?? '',
    exitCode: run.code ?? 1,
    timedOut: run.signal === 'SIGKILL',
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- piston-client`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Piston execution client"
```

---

## Task 5: Judge Logic (test case runner + verdict)

**Files:**

- Create: `src/server/judge/verdict.ts`
- Create: `src/server/judge/runTestCases.ts`
- Test: `tests/judge.test.ts`

**Interfaces:**

- Consumes: `pistonExecute` from Task 4.
- Produces: `runTestCases(language, code, testCases): Promise<{ results: CaseResult[]; verdict: Verdict }>`, used by Task 10 (Run) and Task 12 (Submit).

- [ ] **Step 1: Write failing tests**

Create `tests/judge.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { determineVerdict } from '../src/server/judge/verdict'
import { runTestCases } from '../src/server/judge/runTestCases'

vi.mock('../src/server/piston/client', () => ({
  pistonExecute: vi.fn(),
}))
import { pistonExecute } from '../src/server/piston/client'

describe('determineVerdict', () => {
  it('returns accepted when all cases pass', () => {
    const verdict = determineVerdict([
      {
        input: '1',
        expectedOutput: '2',
        actualOutput: '2',
        passed: true,
        stderr: '',
        timedOut: false,
      },
    ])
    expect(verdict).toBe('accepted')
  })

  it('returns wrong_answer when a case fails without error', () => {
    const verdict = determineVerdict([
      {
        input: '1',
        expectedOutput: '2',
        actualOutput: '3',
        passed: false,
        stderr: '',
        timedOut: false,
      },
    ])
    expect(verdict).toBe('wrong_answer')
  })

  it('returns runtime_error when stderr is present', () => {
    const verdict = determineVerdict([
      {
        input: '1',
        expectedOutput: '2',
        actualOutput: '',
        passed: false,
        stderr: 'Traceback',
        timedOut: false,
      },
    ])
    expect(verdict).toBe('runtime_error')
  })

  it('returns timeout when a case timed out, taking priority over other failures', () => {
    const verdict = determineVerdict([
      {
        input: '1',
        expectedOutput: '2',
        actualOutput: '',
        passed: false,
        stderr: 'Traceback',
        timedOut: true,
      },
    ])
    expect(verdict).toBe('timeout')
  })
})

describe('runTestCases', () => {
  it('runs each test case through Piston and aggregates the verdict', async () => {
    vi.mocked(pistonExecute).mockImplementation(
      async (_lang, _code, stdin) => ({
        stdout: stdin === '1 2' ? '3' : '999',
        stderr: '',
        exitCode: 0,
        timedOut: false,
      }),
    )

    const { results, verdict } = await runTestCases('python', 'code', [
      { input: '1 2', expectedOutput: '3' },
      { input: '5 5', expectedOutput: '10' },
    ])

    expect(results[0].passed).toBe(true)
    expect(results[1].passed).toBe(false)
    expect(verdict).toBe('wrong_answer')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- judge`
Expected: FAIL with "Cannot find module '../src/server/judge/verdict'".

- [ ] **Step 3: Implement verdict logic**

Create `src/server/judge/verdict.ts`:

```ts
export type CaseResult = {
  input: string
  expectedOutput: string
  actualOutput: string
  passed: boolean
  stderr: string
  timedOut: boolean
}

export type Verdict = 'accepted' | 'wrong_answer' | 'runtime_error' | 'timeout'

export function determineVerdict(results: CaseResult[]): Verdict {
  if (results.some((r) => r.timedOut)) return 'timeout'
  if (results.some((r) => r.stderr.trim().length > 0)) return 'runtime_error'
  return results.every((r) => r.passed) ? 'accepted' : 'wrong_answer'
}
```

- [ ] **Step 4: Implement the test case runner**

Create `src/server/judge/runTestCases.ts`:

```ts
import { pistonExecute } from '../piston/client'
import { determineVerdict, type CaseResult, type Verdict } from './verdict'

export type TestCase = { input: string; expectedOutput: string }

export async function runTestCases(
  language: string,
  code: string,
  testCases: TestCase[],
): Promise<{ results: CaseResult[]; verdict: Verdict }> {
  const results: CaseResult[] = []

  for (const testCase of testCases) {
    const output = await pistonExecute(language, code, testCase.input)
    const actualOutput = output.stdout.trim()
    results.push({
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput,
      passed: actualOutput === testCase.expectedOutput.trim(),
      stderr: output.stderr,
      timedOut: output.timedOut,
    })
  }

  return { results, verdict: determineVerdict(results) }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- judge`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add judge test-case runner and verdict logic"
```

---

## Task 6: Authentication (Better Auth, Google/GitHub OAuth, category selection)

**Files:**

- Create: `src/server/auth/auth.ts`
- Create: `src/server/auth/middleware.ts`
- Create: `src/server/auth/category.ts`
- Create: `src/routes/api/auth/$.ts`
- Create: `src/routes/register.tsx`
- Create: `src/server/functions/auth.ts`
- Test: `tests/category.test.ts`

**Interfaces:**

- Produces: `auth` (Better Auth instance), `requireUser(headers)`, `requireAdmin(headers)`, `requireCheckedInParticipant(headers)` — used by every server function in later tasks. `setCategory` server function.
- Consumes: `users, sessions, accounts, verifications` from Task 2's schema.

- [ ] **Step 1: Install dependencies**

```bash
npm install better-auth
```

- [ ] **Step 2: Register OAuth apps**

Create a Google OAuth client (console.cloud.google.com → APIs & Services → Credentials) and a GitHub OAuth App (github.com/settings/developers), both with callback URL `http://localhost:3000/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/github` respectively for local dev. Put the resulting client id/secret pairs into `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`). Generate a random 32-byte string for `BETTER_AUTH_SECRET` (`openssl rand -hex 32`).

- [ ] **Step 3: Configure Better Auth**

Create `src/server/auth/auth.ts`:

```ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../db/client'
import * as schema from '../db/schema'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'participant', input: false },
      category: { type: 'string', required: false, input: false },
      checkinToken: { type: 'string', input: false },
      checkedInAt: { type: 'date', required: false, input: false },
      aiQuestionsUsed: { type: 'number', defaultValue: 0, input: false },
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

- [ ] **Step 4: Mount the auth HTTP handler**

Create `src/routes/api/auth/$.ts`:

```ts
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { auth } from '~/server/auth/auth'

export const Route = createAPIFileRoute('/api/auth/$')({
  GET: ({ request }) => auth.handler(request),
  POST: ({ request }) => auth.handler(request),
})
```

- [ ] **Step 5: Write access-control middleware**

Create `src/server/auth/middleware.ts`:

```ts
import { auth } from './auth'

export async function getSessionUser(headers: Headers) {
  const session = await auth.api.getSession({ headers })
  return session?.user ?? null
}

export async function requireUser(headers: Headers) {
  const user = await getSessionUser(headers)
  if (!user) throw new Error('UNAUTHORIZED')
  return user
}

export async function requireAdmin(headers: Headers) {
  const user = await requireUser(headers)
  if (user.role !== 'admin') throw new Error('FORBIDDEN')
  return user
}

export async function requireCheckedInParticipant(headers: Headers) {
  const user = await requireUser(headers)
  if (!user.checkedInAt) throw new Error('NOT_CHECKED_IN')
  return user
}
```

- [ ] **Step 6: Write failing test for the category-lock rule**

Create `tests/category.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { assertCategoryNotSet } from '../src/server/auth/category'

describe('assertCategoryNotSet', () => {
  it('does not throw when category is null', () => {
    expect(() => assertCategoryNotSet({ category: null })).not.toThrow()
  })

  it('throws when category is already set', () => {
    expect(() => assertCategoryNotSet({ category: 'junior' })).toThrow(
      'Category already set',
    )
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- category`
Expected: FAIL with "Cannot find module '../src/server/auth/category'".

- [ ] **Step 8: Implement the pure guard**

Create `src/server/auth/category.ts`:

```ts
export function assertCategoryNotSet(user: { category: string | null }) {
  if (user.category) {
    throw new Error('Category already set')
  }
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- category`
Expected: PASS (2 tests).

- [ ] **Step 10: Wire the category-selection server function**

Create `src/server/functions/auth.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { users } from '../db/schema'
import { requireUser } from '../auth/middleware'
import { assertCategoryNotSet } from '../auth/category'

export const setCategory = createServerFn({ method: 'POST' })
  .validator((category: 'senior' | 'junior') => category)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const user = await requireUser(request.headers)
    assertCategoryNotSet(user)
    await db.update(users).set({ category: data }).where(eq(users.id, user.id))
    return { category: data }
  })

export const getMe = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getWebRequest()
  return requireUser(request.headers)
})
```

- [ ] **Step 11: Build the registration route**

Create `src/routes/register.tsx`:

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { setCategory } from '~/server/functions/auth'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()

  async function choose(category: 'senior' | 'junior') {
    await setCategory({ data: category })
    navigate({ to: '/problems' })
  }

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Elige tu categoría</h1>
      <div className="flex gap-4">
        <button
          className="rounded bg-blue-600 px-6 py-3 text-white"
          onClick={() => choose('senior')}
        >
          Senior
        </button>
        <button
          className="rounded bg-green-600 px-6 py-3 text-white"
          onClick={() => choose('junior')}
        >
          Junior
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 12: Manual verification**

Run: `npm run dev`, click "Iniciar sesión con Google" (added to `src/routes/index.tsx` linking to `/api/auth/sign-in/google` per Better Auth's client helpers), complete the OAuth flow, confirm redirect to `/register`, choose a category, confirm the `user` row in Postgres has `category` set and `checkin_token` populated (`SELECT * FROM "user";`).

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: add Google/GitHub OAuth via Better Auth and category selection"
```

---

## Task 7: QR Check-in

**Files:**

- Create: `src/server/checkin/result.ts`
- Create: `src/server/functions/checkin.ts`
- Create: `src/components/QrCode.tsx`
- Create: `src/components/QrScanner.tsx`
- Create: `src/routes/profile.tsx`
- Create: `src/routes/admin/checkin.tsx`
- Test: `tests/checkin.test.ts`

**Interfaces:**

- Consumes: `requireAdmin` from Task 6, `users` schema from Task 2.
- Produces: `checkinByToken` server function used only by the admin check-in page.

- [ ] **Step 1: Write failing tests for the pure check-in result logic**

Create `tests/checkin.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildCheckinResult } from '../src/server/checkin/result'

describe('buildCheckinResult', () => {
  it('returns not_found when no user matches the token', () => {
    expect(buildCheckinResult(null)).toEqual({ status: 'not_found' })
  })

  it('returns checked_in for a user checking in for the first time', () => {
    expect(buildCheckinResult({ name: 'Ana', checkedInAt: null })).toEqual({
      status: 'checked_in',
      userName: 'Ana',
    })
  })

  it('returns already_checked_in for a user who already checked in', () => {
    expect(
      buildCheckinResult({ name: 'Ana', checkedInAt: new Date() }),
    ).toEqual({
      status: 'already_checked_in',
      userName: 'Ana',
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- checkin`
Expected: FAIL with "Cannot find module '../src/server/checkin/result'".

- [ ] **Step 3: Implement the pure logic**

Create `src/server/checkin/result.ts`:

```ts
export type CheckinResult =
  | { status: 'checked_in'; userName: string }
  | { status: 'already_checked_in'; userName: string }
  | { status: 'not_found' }

export function buildCheckinResult(
  user: { name: string; checkedInAt: Date | null } | null,
): CheckinResult {
  if (!user) return { status: 'not_found' }
  if (user.checkedInAt)
    return { status: 'already_checked_in', userName: user.name }
  return { status: 'checked_in', userName: user.name }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- checkin`
Expected: PASS (3 tests).

- [ ] **Step 5: Install QR libraries**

```bash
npm install qrcode html5-qrcode
npm install -D @types/qrcode
```

- [ ] **Step 6: Build the check-in server function**

Create `src/server/functions/checkin.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { users } from '../db/schema'
import { requireAdmin } from '../auth/middleware'
import { buildCheckinResult } from '../checkin/result'

export const checkinByToken = createServerFn({ method: 'POST' })
  .validator((token: string) => token)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    await requireAdmin(request.headers)

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.checkinToken, data))
    const result = buildCheckinResult(user ?? null)
    if (result.status === 'checked_in' && user) {
      await db
        .update(users)
        .set({ checkedInAt: new Date() })
        .where(eq(users.id, user.id))
    }
    return result
  })
```

- [ ] **Step 7: Build the QR display component**

Create `src/components/QrCode.tsx`:

```tsx
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrCode({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(value, { width: 256 }).then(setDataUrl)
  }, [value])

  if (!dataUrl) return <div>Generando QR...</div>
  return (
    <img src={dataUrl} alt="Tu código de check-in" width={256} height={256} />
  )
}
```

- [ ] **Step 8: Build the profile route showing the participant's QR**

Create `src/routes/profile.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { getMe } from '~/server/functions/auth'
import { QrCode } from '~/components/QrCode'

export const Route = createFileRoute('/profile')({
  loader: () => getMe(),
  component: ProfilePage,
})

function ProfilePage() {
  const user = Route.useLoaderData()
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h1 className="text-xl font-bold">Hola, {user.name}</h1>
      <p>Muestra este código al llegar al evento para hacer check-in:</p>
      <QrCode value={user.checkinToken} />
      <p>
        {user.checkedInAt
          ? 'Ya hiciste check-in ✅'
          : 'Aún no has hecho check-in'}
      </p>
    </div>
  )
}
```

- [ ] **Step 9: Build the QR scanner component**

Create `src/components/QrScanner.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export function QrScanner({ onScan }: { onScan: (token: string) => void }) {
  const containerId = 'qr-scanner-container'
  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => onScan(decodedText),
        () => {},
      )
      .catch((err) => console.error('No se pudo iniciar la cámara', err))

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [onScan])

  return <div id={containerId} style={{ width: 300 }} />
}
```

- [ ] **Step 10: Build the admin check-in route**

Create `src/routes/admin/checkin.tsx`:

```tsx
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { QrScanner } from '~/components/QrScanner'
import { checkinByToken } from '~/server/functions/checkin'
import type { CheckinResult } from '~/server/checkin/result'

export const Route = createFileRoute('/admin/checkin')({
  component: CheckinPage,
})

function CheckinPage() {
  const [lastResult, setLastResult] = useState<CheckinResult | null>(null)

  async function handleScan(token: string) {
    const result = await checkinByToken({ data: token })
    setLastResult(result)
  }

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h1 className="text-xl font-bold">Check-in</h1>
      <QrScanner onScan={handleScan} />
      {lastResult?.status === 'checked_in' && (
        <p className="text-green-600">✅ {lastResult.userName} presente</p>
      )}
      {lastResult?.status === 'already_checked_in' && (
        <p className="text-yellow-600">
          ⚠️ {lastResult.userName} ya había hecho check-in
        </p>
      )}
      {lastResult?.status === 'not_found' && (
        <p className="text-red-600">❌ Código no reconocido</p>
      )}
    </div>
  )
}
```

- [ ] **Step 11: Manual verification**

Run: `npm run dev`, log in as a participant, visit `/profile`, confirm the QR renders. In another session logged in as an admin, visit `/admin/checkin`, allow camera access, scan the QR shown on the participant's screen (or a phone), confirm the "presente" message appears and `checked_in_at` is set in the DB.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: add QR-based check-in flow"
```

---

## Task 8: Admin Problem CRUD

**Files:**

- Create: `src/server/problems/validate.ts`
- Create: `src/server/functions/problems.ts`
- Create: `src/components/AdminProblemForm.tsx`
- Create: `src/routes/admin/problems/index.tsx`
- Create: `src/routes/admin/problems/$problemId.tsx`
- Test: `tests/problems-validate.test.ts`

**Interfaces:**

- Consumes: `requireAdmin`, `requireCheckedInParticipant` from Task 6; `problems, testCases` schema from Task 2.
- Produces: `listProblems`, `getProblem`, `createProblem`, `updateProblem`, `deleteProblem` server functions — `getProblem`/`listProblems` are consumed by Task 9 (problem UI).

- [ ] **Step 1: Write failing test for input validation**

Create `tests/problems-validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateProblemInput } from '../src/server/problems/validate'

describe('validateProblemInput', () => {
  it('passes for a fully filled problem', () => {
    expect(
      validateProblemInput({
        title: 'Two Sum',
        description: 'Find two numbers...',
        difficulty: 'easy',
        allowedLanguages: ['python'],
      }),
    ).toEqual([])
  })

  it('reports missing title, description, and languages', () => {
    const errors = validateProblemInput({
      title: '  ',
      description: '',
      difficulty: 'easy',
      allowedLanguages: [],
    })
    expect(errors).toContain('El título es requerido')
    expect(errors).toContain('La descripción es requerida')
    expect(errors).toContain('Debe permitir al menos un lenguaje')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- problems-validate`
Expected: FAIL with "Cannot find module '../src/server/problems/validate'".

- [ ] **Step 3: Implement the validator**

Create `src/server/problems/validate.ts`:

```ts
export function validateProblemInput(input: {
  title: string
  description: string
  difficulty: string
  allowedLanguages: string[]
}) {
  const errors: string[] = []
  if (!input.title.trim()) errors.push('El título es requerido')
  if (!input.description.trim()) errors.push('La descripción es requerida')
  if (input.allowedLanguages.length === 0)
    errors.push('Debe permitir al menos un lenguaje')
  return errors
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- problems-validate`
Expected: PASS (2 tests).

- [ ] **Step 5: Build the server functions**

Create `src/server/functions/problems.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { problems, testCases } from '../db/schema'
import { requireAdmin, requireCheckedInParticipant } from '../auth/middleware'
import { validateProblemInput } from '../problems/validate'

type ProblemInput = {
  title: string
  description: string
  difficulty: string
  allowedLanguages: string[]
  sortOrder: number
  testCases: { input: string; expectedOutput: string }[]
}

export const listProblems = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getWebRequest()
    await requireCheckedInParticipant(request.headers)
    return db.select().from(problems).orderBy(problems.sortOrder)
  },
)

export const getProblem = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    await requireCheckedInParticipant(request.headers)
    const [problem] = await db
      .select()
      .from(problems)
      .where(eq(problems.id, data))
    const cases = await db
      .select()
      .from(testCases)
      .where(eq(testCases.problemId, data))
    return { problem, testCases: cases }
  })

export const createProblem = createServerFn({ method: 'POST' })
  .validator((input: ProblemInput) => input)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    await requireAdmin(request.headers)

    const errors = validateProblemInput(data)
    if (errors.length > 0) throw new Error(errors.join(', '))

    const [problem] = await db
      .insert(problems)
      .values({
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        allowedLanguages: data.allowedLanguages,
        sortOrder: data.sortOrder,
      })
      .returning()

    if (data.testCases.length > 0) {
      await db.insert(testCases).values(
        data.testCases.map((tc) => ({
          problemId: problem.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
        })),
      )
    }

    return problem
  })

export const updateProblem = createServerFn({ method: 'POST' })
  .validator((input: ProblemInput & { id: string }) => input)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    await requireAdmin(request.headers)

    const errors = validateProblemInput(data)
    if (errors.length > 0) throw new Error(errors.join(', '))

    await db
      .update(problems)
      .set({
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        allowedLanguages: data.allowedLanguages,
        sortOrder: data.sortOrder,
      })
      .where(eq(problems.id, data.id))

    await db.delete(testCases).where(eq(testCases.problemId, data.id))
    if (data.testCases.length > 0) {
      await db.insert(testCases).values(
        data.testCases.map((tc) => ({
          problemId: data.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
        })),
      )
    }
  })

export const deleteProblem = createServerFn({ method: 'POST' })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    await requireAdmin(request.headers)
    await db.delete(problems).where(eq(problems.id, data))
  })
```

- [ ] **Step 6: Build the reusable admin form component**

Create `src/components/AdminProblemForm.tsx`:

```tsx
import { useState } from 'react'

export type ProblemFormValue = {
  title: string
  description: string
  difficulty: string
  allowedLanguages: string[]
  sortOrder: number
  testCases: { input: string; expectedOutput: string }[]
}

export function AdminProblemForm({
  initial,
  onSubmit,
}: {
  initial: ProblemFormValue
  onSubmit: (value: ProblemFormValue) => void
}) {
  const [value, setValue] = useState(initial)

  function updateTestCase(
    index: number,
    field: 'input' | 'expectedOutput',
    text: string,
  ) {
    const next = value.testCases.slice()
    next[index] = { ...next[index], [field]: text }
    setValue({ ...value, testCases: next })
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
        value={value.title}
        onChange={(e) => setValue({ ...value, title: e.target.value })}
      />
      <textarea
        className="border p-2"
        placeholder="Descripción (markdown)"
        value={value.description}
        onChange={(e) => setValue({ ...value, description: e.target.value })}
      />
      <input
        className="border p-2"
        placeholder="Dificultad (easy/medium/hard)"
        value={value.difficulty}
        onChange={(e) => setValue({ ...value, difficulty: e.target.value })}
      />
      <input
        className="border p-2"
        placeholder="Lenguajes permitidos, separados por coma"
        value={value.allowedLanguages.join(',')}
        onChange={(e) =>
          setValue({
            ...value,
            allowedLanguages: e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
      />
      <h3 className="font-bold">Casos de prueba</h3>
      {value.testCases.map((tc, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="border p-2"
            placeholder="Input"
            value={tc.input}
            onChange={(e) => updateTestCase(i, 'input', e.target.value)}
          />
          <input
            className="border p-2"
            placeholder="Output esperado"
            value={tc.expectedOutput}
            onChange={(e) =>
              updateTestCase(i, 'expectedOutput', e.target.value)
            }
          />
        </div>
      ))}
      <button
        type="button"
        className="rounded bg-gray-200 px-4 py-2"
        onClick={() =>
          setValue({
            ...value,
            testCases: [...value.testCases, { input: '', expectedOutput: '' }],
          })
        }
      >
        + Agregar caso de prueba
      </button>
      <button
        type="submit"
        className="rounded bg-blue-600 px-4 py-2 text-white"
      >
        Guardar
      </button>
    </form>
  )
}
```

- [ ] **Step 7: Build the admin problem list and edit routes**

Create `src/routes/admin/problems/index.tsx`:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { listProblems } from '~/server/functions/problems'

export const Route = createFileRoute('/admin/problems/')({
  loader: () => listProblems(),
  component: AdminProblemsList,
})

function AdminProblemsList() {
  const problems = Route.useLoaderData()
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Problemas</h1>
      <Link
        to="/admin/problems/$problemId"
        params={{ problemId: 'new' }}
        className="text-blue-600"
      >
        + Nuevo problema
      </Link>
      <ul>
        {problems.map((p) => (
          <li key={p.id}>
            <Link to="/admin/problems/$problemId" params={{ problemId: p.id }}>
              {p.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

Create `src/routes/admin/problems/$problemId.tsx`:

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  getProblem,
  createProblem,
  updateProblem,
} from '~/server/functions/problems'
import {
  AdminProblemForm,
  type ProblemFormValue,
} from '~/components/AdminProblemForm'

export const Route = createFileRoute('/admin/problems/$problemId')({
  loader: async ({ params }) => {
    if (params.problemId === 'new') return null
    return getProblem({ data: params.problemId })
  },
  component: AdminProblemEditPage,
})

function AdminProblemEditPage() {
  const { problemId } = Route.useParams()
  const data = Route.useLoaderData()
  const navigate = useNavigate()

  const initial: ProblemFormValue = data
    ? {
        title: data.problem.title,
        description: data.problem.description,
        difficulty: data.problem.difficulty,
        allowedLanguages: data.problem.allowedLanguages,
        sortOrder: data.problem.sortOrder,
        testCases: data.testCases.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
        })),
      }
    : {
        title: '',
        description: '',
        difficulty: 'easy',
        allowedLanguages: [],
        sortOrder: 0,
        testCases: [],
      }

  async function handleSubmit(value: ProblemFormValue) {
    if (problemId === 'new') {
      await createProblem({ data: value })
    } else {
      await updateProblem({ data: { ...value, id: problemId } })
    }
    navigate({ to: '/admin/problems' })
  }

  return <AdminProblemForm initial={initial} onSubmit={handleSubmit} />
}
```

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, log in as an admin, visit `/admin/problems`, create a problem with two test cases, confirm it appears in the list and that reopening it shows the saved values.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add admin problem CRUD"
```

---

## Task 9: Problem List and Detail Page (editor UI)

**Files:**

- Create: `src/components/CodeEditor.tsx`
- Create: `src/components/ProblemDescription.tsx`
- Create: `src/routes/problems/index.tsx`
- Create: `src/routes/problems/$problemId.tsx`

**Interfaces:**

- Consumes: `listProblems`, `getProblem` from Task 8; `requireCheckedInParticipant` from Task 6.
- Produces: the `$problemId.tsx` route's local state (`code`, `language`) is where Task 10 (Run) and Task 12 (Submit) wire their buttons.

- [ ] **Step 1: Install Monaco**

```bash
npm install @monaco-editor/react
```

- [ ] **Step 2: Build the editor wrapper**

Create `src/components/CodeEditor.tsx`:

```tsx
import Editor from '@monaco-editor/react'

const MONACO_LANGUAGE: Record<string, string> = {
  python: 'python',
  javascript: 'javascript',
}

export function CodeEditor({
  language,
  value,
  onChange,
}: {
  language: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Editor
      height="70vh"
      language={MONACO_LANGUAGE[language] ?? 'plaintext'}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      theme="vs-dark"
      options={{ minimap: { enabled: false }, fontSize: 14 }}
    />
  )
}
```

- [ ] **Step 3: Build the problem description panel**

Create `src/components/ProblemDescription.tsx`:

```tsx
export function ProblemDescription({
  title,
  description,
  difficulty,
}: {
  title: string
  description: string
  difficulty: string
}) {
  return (
    <div className="h-[70vh] overflow-y-auto p-4">
      <h1 className="text-xl font-bold">{title}</h1>
      <span className="text-sm uppercase text-gray-500">{difficulty}</span>
      <div className="prose mt-4 whitespace-pre-wrap">{description}</div>
    </div>
  )
}
```

- [ ] **Step 4: Build the problem list route**

Create `src/routes/problems/index.tsx`:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { listProblems } from '~/server/functions/problems'

export const Route = createFileRoute('/problems/')({
  loader: () => listProblems(),
  component: ProblemsListPage,
})

function ProblemsListPage() {
  const problems = Route.useLoaderData()
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Problemas</h1>
      <p className="text-sm text-gray-500">
        Puedes resolverlos en cualquier orden y regresar a cualquiera en
        cualquier momento.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {problems.map((p) => (
          <li key={p.id}>
            <Link
              to="/problems/$problemId"
              params={{ problemId: p.id }}
              className="text-blue-600"
            >
              {p.title} — {p.difficulty}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 5: Build the problem detail route (split panel)**

Create `src/routes/problems/$problemId.tsx`:

```tsx
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getProblem } from '~/server/functions/problems'
import { ProblemDescription } from '~/components/ProblemDescription'
import { CodeEditor } from '~/components/CodeEditor'

export const Route = createFileRoute('/problems/$problemId')({
  loader: ({ params }) => getProblem({ data: params.problemId }),
  component: ProblemDetailPage,
})

function ProblemDetailPage() {
  const { problem, testCases } = Route.useLoaderData()
  const [language, setLanguage] = useState(problem.allowedLanguages[0])
  const [code, setCode] = useState('')

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <ProblemDescription
        title={problem.title}
        description={problem.description}
        difficulty={problem.difficulty}
      />
      <div>
        <select
          className="border p-2"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {problem.allowedLanguages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <CodeEditor language={language} value={code} onChange={setCode} />
        {/* Run and Submit buttons wired in Task 10 and Task 12 */}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, log in as a checked-in participant, visit `/problems`, click into a problem, confirm the description renders on the left and the Monaco editor on the right, and that switching the language dropdown updates the editor's syntax highlighting.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add problem list and split-panel problem detail page"
```

---

## Task 10: Run Flow

**Files:**

- Create: `src/server/functions/run.ts`
- Create: `src/components/RunResults.tsx`
- Modify: `src/routes/problems/$problemId.tsx`

**Interfaces:**

- Consumes: `runTestCases` from Task 5; `getProblem`-shaped test case data.
- Produces: `runCode` server function.

- [ ] **Step 1: Build the run server function**

Create `src/server/functions/run.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { problems, testCases } from '../db/schema'
import { requireCheckedInParticipant } from '../auth/middleware'
import { runTestCases } from '../judge/runTestCases'

export const runCode = createServerFn({ method: 'POST' })
  .validator(
    (input: { problemId: string; language: string; code: string }) => input,
  )
  .handler(async ({ data }) => {
    const request = getWebRequest()
    await requireCheckedInParticipant(request.headers)

    const [problem] = await db
      .select()
      .from(problems)
      .where(eq(problems.id, data.problemId))
    if (!problem) throw new Error('Problem not found')
    const cases = await db
      .select()
      .from(testCases)
      .where(eq(testCases.problemId, data.problemId))

    const { results } = await runTestCases(
      data.language,
      data.code,
      cases.map((c) => ({ input: c.input, expectedOutput: c.expectedOutput })),
    )
    return { results }
  })
```

- [ ] **Step 2: Build the results display component**

Create `src/components/RunResults.tsx`:

```tsx
import type { CaseResult } from '~/server/judge/verdict'

export function RunResults({ results }: { results: CaseResult[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {results.map((r, i) => (
        <li key={i} className={r.passed ? 'text-green-600' : 'text-red-600'}>
          {r.passed ? '✅' : '❌'} Input: <code>{r.input}</code> — Esperado:{' '}
          <code>{r.expectedOutput}</code> — Obtenido:{' '}
          <code>{r.actualOutput || r.stderr}</code>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 3: Wire the Run button into the problem detail page**

Modify `src/routes/problems/$problemId.tsx` — add state and a button:

```tsx
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getProblem } from '~/server/functions/problems'
import { runCode } from '~/server/functions/run'
import { ProblemDescription } from '~/components/ProblemDescription'
import { CodeEditor } from '~/components/CodeEditor'
import { RunResults } from '~/components/RunResults'
import type { CaseResult } from '~/server/judge/verdict'

export const Route = createFileRoute('/problems/$problemId')({
  loader: ({ params }) => getProblem({ data: params.problemId }),
  component: ProblemDetailPage,
})

function ProblemDetailPage() {
  const { problem, testCases } = Route.useLoaderData()
  const [language, setLanguage] = useState(problem.allowedLanguages[0])
  const [code, setCode] = useState('')
  const [runResults, setRunResults] = useState<CaseResult[] | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  async function handleRun() {
    setIsRunning(true)
    try {
      const { results } = await runCode({
        data: { problemId: problem.id, language, code },
      })
      setRunResults(results)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <ProblemDescription
        title={problem.title}
        description={problem.description}
        difficulty={problem.difficulty}
      />
      <div>
        <select
          className="border p-2"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {problem.allowedLanguages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <CodeEditor language={language} value={code} onChange={setCode} />
        <button
          className="mt-2 rounded bg-gray-700 px-4 py-2 text-white"
          onClick={handleRun}
          disabled={isRunning}
        >
          {isRunning ? 'Ejecutando...' : 'Run'}
        </button>
        {runResults && <RunResults results={runResults} />}
        {/* Submit button wired in Task 12 */}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Manual verification**

Requires Piston running locally: `docker run --name piston -p 2000:2000 -d ghcr.io/engineer-man/piston` then install a language: `curl -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" -d '{"language":"python","version":"3.10.0"}'`. Then: `npm run dev`, open a problem with a Python test case, click Run, confirm pass/fail markers render per case.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Run flow wired to Piston"
```

---

## Task 11: Claude Submission Feedback Module

**Files:**

- Create: `src/server/claude/feedback.ts`
- Test: `tests/claude-feedback.test.ts`

**Interfaces:**

- Produces: `buildFeedbackPrompt(input): string` (pure, tested directly) and `generateSubmissionFeedback(input): Promise<string>`, used by Task 12 (Submit).
- Consumes: `process.env.ANTHROPIC_API_KEY`.

- [ ] **Step 1: Install the Anthropic SDK**

```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Write failing tests**

Create `tests/claude-feedback.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { buildFeedbackPrompt } from '../src/server/claude/feedback'

describe('buildFeedbackPrompt', () => {
  it('asks for a style comment when the verdict is accepted', () => {
    const prompt = buildFeedbackPrompt({
      problemTitle: 'Two Sum',
      problemDescription: 'Find two numbers that add up to target.',
      code: 'def two_sum(): pass',
      verdict: 'accepted',
      stderr: '',
    })
    expect(prompt).toContain('estilo o eficiencia')
    expect(prompt).not.toContain('sin escribir el código corregido')
  })

  it('asks for a hint without the fix when the verdict failed', () => {
    const prompt = buildFeedbackPrompt({
      problemTitle: 'Two Sum',
      problemDescription: 'Find two numbers that add up to target.',
      code: 'def two_sum(): pass',
      verdict: 'wrong_answer',
      stderr: '',
    })
    expect(prompt).toContain('sin escribir el código corregido')
  })

  it('includes stderr when present', () => {
    const prompt = buildFeedbackPrompt({
      problemTitle: 'Two Sum',
      problemDescription: 'desc',
      code: 'code',
      verdict: 'runtime_error',
      stderr: 'IndexError: list index out of range',
    })
    expect(prompt).toContain('IndexError: list index out of range')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- claude-feedback`
Expected: FAIL with "Cannot find module '../src/server/claude/feedback'".

- [ ] **Step 4: Implement**

Create `src/server/claude/feedback.ts`:

````ts
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export function buildFeedbackPrompt(input: {
  problemTitle: string
  problemDescription: string
  code: string
  verdict: string
  stderr: string
}): string {
  return [
    `Problema: ${input.problemTitle}`,
    input.problemDescription,
    '',
    'Código enviado por el participante:',
    '```',
    input.code,
    '```',
    '',
    `Veredicto del juez automático: ${input.verdict}`,
    input.stderr ? `Salida de error:\n${input.stderr}` : '',
    '',
    input.verdict === 'accepted'
      ? 'La solución es correcta. Da un comentario breve (2-3 frases) sobre el estilo o eficiencia del código.'
      : 'La solución no pasó. Da una pista breve (2-3 frases) sobre qué pudo haber fallado, sin escribir el código corregido ni la solución completa.',
  ].join('\n')
}

export async function generateSubmissionFeedback(input: {
  problemTitle: string
  problemDescription: string
  code: string
  verdict: string
  stderr: string
}): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    messages: [{ role: 'user', content: buildFeedbackPrompt(input) }],
  })
  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}
````

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- claude-feedback`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Claude submission feedback module"
```

---

## Task 12: Submit Flow

**Files:**

- Create: `src/server/functions/submit.ts`
- Create: `src/components/SubmitResult.tsx`
- Modify: `src/routes/problems/$problemId.tsx`

**Interfaces:**

- Consumes: `runTestCases` from Task 5, `generateSubmissionFeedback` from Task 11, `submissions` schema from Task 2.
- Produces: `submitCode` and `getSubmission` server functions.

- [ ] **Step 1: Build the submit and poll server functions**

Create `src/server/functions/submit.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { problems, testCases, submissions } from '../db/schema'
import { requireCheckedInParticipant } from '../auth/middleware'
import { runTestCases } from '../judge/runTestCases'
import { generateSubmissionFeedback } from '../claude/feedback'

export const submitCode = createServerFn({ method: 'POST' })
  .validator(
    (input: { problemId: string; language: string; code: string }) => input,
  )
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const user = await requireCheckedInParticipant(request.headers)

    const [problem] = await db
      .select()
      .from(problems)
      .where(eq(problems.id, data.problemId))
    if (!problem) throw new Error('Problem not found')
    const cases = await db
      .select()
      .from(testCases)
      .where(eq(testCases.problemId, data.problemId))

    const [submission] = await db
      .insert(submissions)
      .values({
        userId: user.id,
        problemId: data.problemId,
        code: data.code,
        language: data.language,
        status: 'pending',
      })
      .returning()

    const { results, verdict } = await runTestCases(
      data.language,
      data.code,
      cases.map((c) => ({ input: c.input, expectedOutput: c.expectedOutput })),
    )
    const stderr = results.find((r) => r.stderr)?.stderr ?? ''

    await db
      .update(submissions)
      .set({ status: verdict })
      .where(eq(submissions.id, submission.id))

    generateSubmissionFeedback({
      problemTitle: problem.title,
      problemDescription: problem.description,
      code: data.code,
      verdict,
      stderr,
    })
      .then((feedback) =>
        db
          .update(submissions)
          .set({ claudeFeedback: feedback })
          .where(eq(submissions.id, submission.id)),
      )
      .catch((err) => console.error('Claude feedback failed', err))

    return { submissionId: submission.id, verdict }
  })

export const getSubmission = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    await requireCheckedInParticipant(request.headers)
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, data))
    return submission ?? null
  })
```

- [ ] **Step 2: Build the submit result component with feedback polling**

Create `src/components/SubmitResult.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { getSubmission } from '~/server/functions/submit'

export function SubmitResult({
  submissionId,
  verdict,
}: {
  submissionId: string
  verdict: string
}) {
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const interval = setInterval(async () => {
      const submission = await getSubmission({ data: submissionId })
      if (!cancelled && submission?.claudeFeedback) {
        setFeedback(submission.claudeFeedback)
        clearInterval(interval)
      }
    }, 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [submissionId])

  return (
    <div className="mt-4 rounded border p-4">
      <p className="font-bold">Veredicto: {verdict}</p>
      <p className="mt-2 text-sm text-gray-600">
        {feedback ?? 'Generando feedback...'}
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Wire the Submit button into the problem detail page**

Modify `src/routes/problems/$problemId.tsx` to add submit state and button (added alongside the existing Run button from Task 10):

```tsx
import { submitCode } from '~/server/functions/submit'
import { SubmitResult } from '~/components/SubmitResult'

// inside ProblemDetailPage, alongside the existing state:
const [submitResult, setSubmitResult] = useState<{
  submissionId: string
  verdict: string
} | null>(null)
const [isSubmitting, setIsSubmitting] = useState(false)

async function handleSubmit() {
  setIsSubmitting(true)
  try {
    const result = await submitCode({
      data: { problemId: problem.id, language, code },
    })
    setSubmitResult(result)
  } finally {
    setIsSubmitting(false)
  }
}

// in the JSX, after the Run button and RunResults:
;<button
  className="mt-2 ml-2 rounded bg-blue-600 px-4 py-2 text-white"
  onClick={handleSubmit}
  disabled={isSubmitting}
>
  {isSubmitting ? 'Enviando...' : 'Submit'}
</button>
{
  submitResult && (
    <SubmitResult
      submissionId={submitResult.submissionId}
      verdict={submitResult.verdict}
    />
  )
}
```

- [ ] **Step 4: Manual verification**

With Piston and `ANTHROPIC_API_KEY` set, submit a correct solution: confirm the verdict shows immediately as `accepted` and that a feedback comment appears within a few seconds. Submit an incorrect solution: confirm verdict `wrong_answer` and a hint-style feedback (no full corrected code) appears.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Submit flow with async Claude feedback"
```

---

## Task 13: Leaderboard

**Files:**

- Create: `src/server/functions/leaderboard.ts`
- Create: `src/components/LeaderboardTable.tsx`
- Create: `src/routes/leaderboard.tsx`

**Interfaces:**

- Consumes: `calculateStandings`, `groupStandingsByCategory` from Task 3; `tournamentState`, `users`, `submissions` schema from Task 2.
- Produces: `getStandings` server function.

- [ ] **Step 1: Build the standings server function**

Create `src/server/functions/leaderboard.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { eq, isNotNull } from 'drizzle-orm'
import { db } from '../db/client'
import { users, submissions, tournamentState } from '../db/schema'
import {
  calculateStandings,
  groupStandingsByCategory,
} from '../standings/calculate'

export const getStandings = createServerFn({ method: 'GET' }).handler(
  async () => {
    const [state] = await db
      .select()
      .from(tournamentState)
      .where(eq(tournamentState.id, 1))
    if (!state?.startedAt) {
      return { started: false as const, senior: [], junior: [] }
    }

    const allUsers = await db
      .select()
      .from(users)
      .where(isNotNull(users.category))
    const allSubmissions = await db.select().from(submissions)

    const rows = calculateStandings(
      allUsers.map((u) => ({ id: u.id, name: u.name, category: u.category! })),
      allSubmissions.map((s) => ({
        userId: s.userId,
        problemId: s.problemId,
        status: s.status,
        createdAt: s.createdAt,
      })),
      state.startedAt,
    )
    const grouped = groupStandingsByCategory(rows)
    return { started: true as const, ...grouped }
  },
)
```

- [ ] **Step 2: Build the table component**

Create `src/components/LeaderboardTable.tsx`:

```tsx
import type { StandingRow } from '~/server/standings/calculate'

export function LeaderboardTable({
  title,
  rows,
}: {
  title: string
  rows: StandingRow[]
}) {
  return (
    <div>
      <h2 className="text-lg font-bold">{title}</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2 text-left">#</th>
            <th className="border p-2 text-left">Nombre</th>
            <th className="border p-2 text-left">Resueltos</th>
            <th className="border p-2 text-left">Tiempo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.userId}>
              <td className="border p-2">{i + 1}</td>
              <td className="border p-2">{row.name}</td>
              <td className="border p-2">{row.solvedCount}</td>
              <td className="border p-2">
                {Math.round(row.totalPenaltyMinutes)} min
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Build the leaderboard route with polling**

Create `src/routes/leaderboard.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getStandings } from '~/server/functions/leaderboard'
import { LeaderboardTable } from '~/components/LeaderboardTable'

export const Route = createFileRoute('/leaderboard')({
  loader: () => getStandings(),
  component: LeaderboardPage,
})

function LeaderboardPage() {
  const initial = Route.useLoaderData()
  const [data, setData] = useState(initial)

  useEffect(() => {
    const interval = setInterval(() => {
      getStandings().then(setData)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  if (!data.started)
    return <p className="p-8">El torneo aún no ha comenzado.</p>

  return (
    <div className="grid grid-cols-2 gap-8 p-8">
      <LeaderboardTable title="Senior" rows={data.senior} />
      <LeaderboardTable title="Junior" rows={data.junior} />
    </div>
  )
}
```

- [ ] **Step 4: Manual verification**

With at least one accepted submission per category in the DB and `tournament_state.started_at` set, visit `/leaderboard`, confirm both tables render sorted correctly, and confirm a new accepted submission updates the table within ~3 seconds without a manual refresh.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add live leaderboard split by category"
```

---

## Task 14: Junior AI Assistant

**Files:**

- Create: `src/server/assistant/limit.ts`
- Create: `src/server/claude/assistant.ts`
- Create: `src/server/functions/assistant.ts`
- Create: `src/components/AssistantModal.tsx`
- Modify: `src/routes/problems/$problemId.tsx`
- Test: `tests/assistant-limit.test.ts`

**Interfaces:**

- Consumes: `requireCheckedInParticipant` from Task 6; `aiQuestions`, `users` schema from Task 2.
- Produces: `askAssistant` server function.

- [ ] **Step 1: Write failing tests for the limit rule**

Create `tests/assistant-limit.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { canAskQuestion } from '../src/server/assistant/limit'

describe('canAskQuestion', () => {
  it('allows a junior participant with 0 questions used', () => {
    expect(canAskQuestion({ category: 'junior', aiQuestionsUsed: 0 })).toBe(
      true,
    )
  })

  it('allows a junior participant with 1 question used', () => {
    expect(canAskQuestion({ category: 'junior', aiQuestionsUsed: 1 })).toBe(
      true,
    )
  })

  it('blocks a junior participant with 2 questions used', () => {
    expect(canAskQuestion({ category: 'junior', aiQuestionsUsed: 2 })).toBe(
      false,
    )
  })

  it('blocks a senior participant regardless of questions used', () => {
    expect(canAskQuestion({ category: 'senior', aiQuestionsUsed: 0 })).toBe(
      false,
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- assistant-limit`
Expected: FAIL with "Cannot find module '../src/server/assistant/limit'".

- [ ] **Step 3: Implement the pure limit check**

Create `src/server/assistant/limit.ts`:

```ts
export function canAskQuestion(user: {
  category: string
  aiQuestionsUsed: number
}): boolean {
  return user.category === 'junior' && user.aiQuestionsUsed < 2
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- assistant-limit`
Expected: PASS (4 tests).

- [ ] **Step 5: Build the guarded Claude call**

Create `src/server/claude/assistant.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Eres un asistente para participantes junior de un torneo de programación.
Solo puedes responder preguntas generales de sintaxis o uso de funciones/estructuras estándar
del lenguaje (por ejemplo: cómo usar .filter en JavaScript, cómo declarar un array en Java).
NUNCA debes dar la lógica o solución del problema que el participante está resolviendo, aunque
la pregunta lo insinúe o lo pida directamente. Si detectas que la pregunta busca la solución del
problema actual, responde amablemente que no puedes ayudar con eso y sugiere que reformule
hacia una pregunta general de sintaxis.`

export async function answerJuniorQuestion(input: {
  problemDescription: string
  question: string
}): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Contexto del problema actual (solo para que sepas qué evitar revelar):\n${input.problemDescription}\n\nPregunta del participante: ${input.question}`,
      },
    ],
  })
  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}
```

- [ ] **Step 6: Build the server function enforcing the limit**

Create `src/server/functions/assistant.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { problems, aiQuestions, users } from '../db/schema'
import { requireCheckedInParticipant } from '../auth/middleware'
import { canAskQuestion } from '../assistant/limit'
import { answerJuniorQuestion } from '../claude/assistant'

export const askAssistant = createServerFn({ method: 'POST' })
  .validator((input: { problemId: string; question: string }) => input)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const user = await requireCheckedInParticipant(request.headers)

    if (
      !user.category ||
      !canAskQuestion({
        category: user.category,
        aiQuestionsUsed: user.aiQuestionsUsed,
      })
    ) {
      throw new Error('AI_LIMIT_REACHED')
    }

    const [problem] = await db
      .select()
      .from(problems)
      .where(eq(problems.id, data.problemId))
    if (!problem) throw new Error('Problem not found')

    const answer = await answerJuniorQuestion({
      problemDescription: problem.description,
      question: data.question,
    })

    await db.insert(aiQuestions).values({
      userId: user.id,
      problemId: data.problemId,
      question: data.question,
      answer,
    })
    await db
      .update(users)
      .set({ aiQuestionsUsed: user.aiQuestionsUsed + 1 })
      .where(eq(users.id, user.id))

    return { answer, questionsRemaining: 2 - (user.aiQuestionsUsed + 1) }
  })
```

- [ ] **Step 7: Build the assistant modal component**

Create `src/components/AssistantModal.tsx`:

```tsx
import { useState } from 'react'
import { askAssistant } from '~/server/functions/assistant'

export function AssistantModal({
  problemId,
  questionsUsed,
  onClose,
}: {
  problemId: string
  questionsUsed: number
  onClose: () => void
}) {
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<{ question: string; answer: string }[]>([])
  const [remaining, setRemaining] = useState(2 - questionsUsed)
  const [isAsking, setIsAsking] = useState(false)

  async function handleAsk() {
    setIsAsking(true)
    try {
      const result = await askAssistant({ data: { problemId, question } })
      setTurns([...turns, { question, answer: result.answer }])
      setRemaining(result.questionsRemaining)
      setQuestion('')
    } finally {
      setIsAsking(false)
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
          Preguntas restantes: {remaining}/2
        </p>
        {turns.map((t, i) => (
          <div key={i} className="mt-2 text-sm">
            <p className="font-bold">Tú: {t.question}</p>
            <p>Haiku: {t.answer}</p>
          </div>
        ))}
        <textarea
          className="mt-2 w-full border p-2"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={remaining <= 0}
          placeholder="Ej: ¿cómo uso .filter en JavaScript?"
        />
        <button
          className="mt-2 w-full rounded bg-green-600 px-4 py-2 text-white disabled:bg-gray-300"
          onClick={handleAsk}
          disabled={remaining <= 0 || isAsking || !question.trim()}
        >
          {remaining <= 0
            ? 'Ya usaste tus 2 preguntas'
            : isAsking
              ? 'Preguntando...'
              : 'Preguntar'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Show the button only for junior participants**

Modify `src/routes/problems/$problemId.tsx` — extend the loader to also fetch the current user, and conditionally render the button:

```tsx
import { AssistantModal } from '~/components/AssistantModal'
import { getMe } from '~/server/functions/auth'

// inside ProblemDetailPage:
const [showAssistant, setShowAssistant] = useState(false)
const user = Route.useLoaderData().user // loader combines getProblem + getMe results, see below

// in JSX, only for junior:
{
  user.category === 'junior' && (
    <button
      className="mt-2 rounded bg-purple-600 px-4 py-2 text-white"
      onClick={() => setShowAssistant(true)}
    >
      Preguntar a Haiku
    </button>
  )
}
{
  showAssistant && (
    <AssistantModal
      problemId={problem.id}
      questionsUsed={user.aiQuestionsUsed}
      onClose={() => setShowAssistant(false)}
    />
  )
}
```

Update the route's `loader` to fetch both pieces of data together:

```ts
loader: async ({ params }) => {
  const [problemData, user] = await Promise.all([getProblem({ data: params.problemId }), getMe()])
  return { ...problemData, user }
},
```

- [ ] **Step 9: Manual verification**

Log in as a junior participant, open a problem, confirm the "Preguntar a Haiku" button is visible; ask 2 questions and confirm the counter reaches 0/2 and the input disables; ask something like "dame la solución completa del problema" and confirm Haiku declines and redirects toward a syntax question instead. Log in as a senior participant and confirm the button is not shown at all.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add junior-only Haiku syntax assistant with 2-question limit"
```

---

## Task 15: Tournament Start Control

**Files:**

- Create: `src/server/tournament/guard.ts`
- Create: `src/server/functions/tournament.ts`
- Create: `src/routes/admin/tournament.tsx`
- Test: `tests/tournament-guard.test.ts`

**Interfaces:**

- Consumes: `requireAdmin` from Task 6; `tournamentState` schema from Task 2. Also read by Task 13's `getStandings`, already built against `tournamentState.startedAt`.
- Produces: `startTournament`, `getTournamentState` server functions.

- [ ] **Step 1: Write failing test for the guard**

Create `tests/tournament-guard.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { assertNotStarted } from '../src/server/tournament/guard'

describe('assertNotStarted', () => {
  it('does not throw when the tournament has not started', () => {
    expect(() => assertNotStarted({ startedAt: null })).not.toThrow()
  })

  it('throws when the tournament already started', () => {
    expect(() => assertNotStarted({ startedAt: new Date() })).toThrow(
      'El torneo ya comenzó',
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tournament-guard`
Expected: FAIL with "Cannot find module '../src/server/tournament/guard'".

- [ ] **Step 3: Implement the guard**

Create `src/server/tournament/guard.ts`:

```ts
export function assertNotStarted(state: { startedAt: Date | null }) {
  if (state.startedAt) {
    throw new Error('El torneo ya comenzó')
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tournament-guard`
Expected: PASS (2 tests).

- [ ] **Step 5: Build the server functions**

Create `src/server/functions/tournament.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { tournamentState } from '../db/schema'
import { requireAdmin } from '../auth/middleware'
import { assertNotStarted } from '../tournament/guard'

export const getTournamentState = createServerFn({ method: 'GET' }).handler(
  async () => {
    const [state] = await db
      .select()
      .from(tournamentState)
      .where(eq(tournamentState.id, 1))
    return state ?? { id: 1, startedAt: null }
  },
)

export const startTournament = createServerFn({ method: 'POST' }).handler(
  async () => {
    const request = getWebRequest()
    await requireAdmin(request.headers)

    const [existing] = await db
      .select()
      .from(tournamentState)
      .where(eq(tournamentState.id, 1))
    assertNotStarted(existing ?? { startedAt: null })

    const startedAt = new Date()
    await db
      .insert(tournamentState)
      .values({ id: 1, startedAt })
      .onConflictDoUpdate({ target: tournamentState.id, set: { startedAt } })

    return { startedAt }
  },
)
```

- [ ] **Step 6: Build the admin control route**

Create `src/routes/admin/tournament.tsx`:

```tsx
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  getTournamentState,
  startTournament,
} from '~/server/functions/tournament'

export const Route = createFileRoute('/admin/tournament')({
  loader: () => getTournamentState(),
  component: TournamentControlPage,
})

function TournamentControlPage() {
  const initial = Route.useLoaderData()
  const [state, setState] = useState(initial)

  async function handleStart() {
    const result = await startTournament()
    setState({ id: 1, startedAt: result.startedAt })
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Control del torneo</h1>
      {state.startedAt ? (
        <p>
          Torneo iniciado a las {new Date(state.startedAt).toLocaleTimeString()}
        </p>
      ) : (
        <button
          className="rounded bg-red-600 px-4 py-2 text-white"
          onClick={handleStart}
        >
          Iniciar torneo
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Manual verification**

Log in as admin, visit `/admin/tournament`, click "Iniciar torneo", confirm the timestamp shows and the button disappears; confirm `/leaderboard` (Task 13) switches from "El torneo aún no ha comenzado" to showing both tables.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add tournament start control for admin"
```

---

## Task 16: Deployment to Railway

**Files:**

- Create: `.env.example` updates (already created in Task 2; confirm all vars listed)
- Create: `scripts/install-piston-languages.sh`
- Document: Railway service setup (no application code — infra configuration)

**Interfaces:**

- Consumes: every server module's `process.env.*` reads defined in prior tasks.
- Produces: a live deployment reachable at a Railway-provided URL.

- [ ] **Step 1: Create the Postgres service**

In the Railway dashboard, create a new project, add a **Postgres** plugin. Note the generated `DATABASE_URL` (Railway exposes it as a reference variable, e.g. `${{Postgres.DATABASE_URL}}`).

- [ ] **Step 2: Create the Piston service**

Add a new service to the same Railway project, choosing "Deploy from Docker Image" with image `ghcr.io/engineer-man/piston`. Under its Networking settings, do **not** expose a public domain — only enable private networking, which gives it an internal address like `piston.railway.internal` on port `2000`.

- [ ] **Step 3: Install language runtimes into Piston**

Create `scripts/install-piston-languages.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

PISTON_URL="${1:?Usage: install-piston-languages.sh <piston-url>}"

for pkg in '{"language":"python","version":"3.10.0"}' '{"language":"javascript","version":"18.15.0"}'; do
  curl -sf -X POST "$PISTON_URL/api/v2/packages" -H "Content-Type: application/json" -d "$pkg"
done
```

Run it once against the Piston service's temporarily-exposed public URL (enable a public domain briefly, run the script, then disable the public domain again):

```bash
chmod +x scripts/install-piston-languages.sh
./scripts/install-piston-languages.sh https://<piston-temp-public-url>
```

- [ ] **Step 4: Create the main app service**

Add a third service, connected to this project's GitHub repository. Railway auto-detects the Node app via Nixpacks; confirm the build command resolves to `npm run build` and the start command to `npm run start` (adjust in service settings if the scaffold from Task 1 named them differently).

- [ ] **Step 5: Configure environment variables on the app service**

Set: `DATABASE_URL` (reference to the Postgres plugin), `PISTON_URL=http://piston.railway.internal:2000`, `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `BETTER_AUTH_SECRET`. Update the Google/GitHub OAuth app callback URLs to point at the Railway-provided domain (`https://<app>.up.railway.app/api/auth/callback/google` and `.../github`).

- [ ] **Step 6: Run migrations against production**

Add a **Deploy Command** (Railway service setting) that runs before the app starts:

```bash
npx drizzle-kit push && npm run start
```

- [ ] **Step 7: Deploy and smoke-test**

Trigger a deploy. Once live: visit the app's public URL, log in with Google, confirm redirect to `/register`, pick a category, confirm the `user` row appears in the Railway Postgres console. Open `/problems`, submit a trivial "print hello" solution for a problem with a matching test case, confirm the verdict comes back `accepted` (proving the app can reach the private Piston service) and that Claude feedback appears a few seconds later (proving `ANTHROPIC_API_KEY` is wired correctly).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: add Piston language install script and Railway deployment notes"
```

---

## Task 17: Admin Live Submissions Feed

**Files:**

- Create: `src/server/functions/admin-submissions.ts`
- Create: `src/routes/admin/submissions.tsx`

**Interfaces:**

- Consumes: `requireAdmin` from Task 6; `submissions, users, problems` schema from Task 2.
- Produces: `listAllSubmissions` server function.

- [ ] **Step 1: Build the server function**

Create `src/server/functions/admin-submissions.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { submissions, users, problems } from '../db/schema'
import { requireAdmin } from '../auth/middleware'

export const listAllSubmissions = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getWebRequest()
    await requireAdmin(request.headers)

    return db
      .select({
        id: submissions.id,
        userName: users.name,
        problemTitle: problems.title,
        language: submissions.language,
        status: submissions.status,
        createdAt: submissions.createdAt,
      })
      .from(submissions)
      .innerJoin(users, eq(submissions.userId, users.id))
      .innerJoin(problems, eq(submissions.problemId, problems.id))
      .orderBy(desc(submissions.createdAt))
      .limit(100)
  },
)
```

- [ ] **Step 2: Build the admin route with polling**

Create `src/routes/admin/submissions.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { listAllSubmissions } from '~/server/functions/admin-submissions'

export const Route = createFileRoute('/admin/submissions')({
  loader: () => listAllSubmissions(),
  component: AdminSubmissionsPage,
})

function AdminSubmissionsPage() {
  const initial = Route.useLoaderData()
  const [rows, setRows] = useState(initial)

  useEffect(() => {
    const interval = setInterval(() => {
      listAllSubmissions().then(setRows)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Submissions en vivo</h1>
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
                {new Date(row.createdAt).toLocaleTimeString()}
              </td>
              <td className="border p-2">{row.userName}</td>
              <td className="border p-2">{row.problemTitle}</td>
              <td className="border p-2">{row.language}</td>
              <td className="border p-2">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Manual verification**

Log in as admin, visit `/admin/submissions`, submit a solution from another (participant) session, confirm the new row appears within ~3 seconds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add admin live submissions feed"
```
