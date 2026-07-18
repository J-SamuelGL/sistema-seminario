# Railway Deployment Guide

This document outlines the steps to deploy the Torneo de Programación application to Railway.

## Prerequisites

- Railway account and CLI access
- GitHub repository connected to Railway
- A Judge0 CE API key from [RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce) — see Step 2; no
  separate VPS needed (the previous self-hosted Piston setup was replaced with the hosted Judge0 API — Piston
  under real tournament concurrency, even on a 4 vCPU/8GB VPS, took 15–55s per Java/C# submission; Judge0
  handles the same load in 1–3.5s, see the migration discussion for the load-test numbers)
- Environment variables ready (see `.env.example`)

## Deployment Steps

### Step 1: Create the MySQL Service

1. In the Railway dashboard, create a new project
2. Add a **MySQL** plugin to the project
3. Note the generated `DATABASE_URL` (Railway exposes it as a reference variable, e.g. `${{MySQL.DATABASE_URL}}`)

### Step 2: Get a Judge0 CE API key (RapidAPI)

The code judge no longer runs on infrastructure you host — `src/server/judge0/client.ts` calls the
[Judge0 CE](https://rapidapi.com/judge0-official/api/judge0-ce) API on RapidAPI.

1. Create a RapidAPI account if you don't have one, and subscribe to the **Basic** plan on the Judge0 CE page
   (`https://rapidapi.com/judge0-official/api/judge0-ce/pricing`) — it's "pay per use" with **no monthly fee**
   ($0.0017 per submission execution); there's no need for the Pro/Ultra/Mega tiers unless you expect more
   than ~2,000 executions in a single day. For a one-day event with ~30 participants, expect a total cost in
   the single-digit to low-tens of dollars — see the cost breakdown in the migration discussion.
2. From the API's **Endpoints** tab, copy your personal `X-RapidAPI-Key`.
3. Smoke-test it:
   ```bash
   curl --request GET \
     --url https://judge0-ce.p.rapidapi.com/about \
     --header 'x-rapidapi-host: judge0-ce.p.rapidapi.com' \
     --header 'x-rapidapi-key: <your-key>'
   # should return {"version":"1.14.0", ...}
   ```

`src/server/judge0/languages.ts` maps our five language names to Judge0's `language_id`s — these are pinned to
specific Judge0 CE versions and confirmed compatible with the harness generators in
`src/server/judge/harness/*.ts` (none of them use version-specific syntax). If Judge0 CE adds/removes language
versions in the future, re-check `GET /languages` and update the mapping.

### Step 3: Create the Main App Service

1. Add a third service, connected to this project's GitHub repository
2. Railway auto-detects the Node app via Nixpacks
3. Confirm the build command resolves to `npm run build` and the start command to `npm run start`
4. Adjust in service settings if necessary

Note: `vite build` (this version of `@tanstack/react-start`, which builds on Vite rather than Nitro) does not
emit a self-starting Node server — `dist/server/server.js` only exports a `{ fetch }` handler. `npm run start`
runs it through `srvx serve` (an explicit `dependencies` entry, not left to transitive resolution, since a
production-only install could otherwise drop it), which respects Railway's injected `PORT` and binds all
interfaces, and also serves the static assets in `dist/client` — without `--static` pointed at it, JS/CSS
return 404 and the page renders as an unstyled, non-hydrated shell. That flag's path resolves relative to the
entry file's directory (`dist/server/`), not the working directory, hence `../client` rather than
`dist/client` — confirmed by reading `node_modules/srvx/dist/cli.mjs`.

### Step 4: Configure Environment Variables

Set the following environment variables on the app service:

- `DATABASE_URL` - Reference to the MySQL plugin: `${{MySQL.DATABASE_URL}}`
- `JUDGE0_URL` - `https://judge0-ce.p.rapidapi.com` (default if unset — only override for a self-hosted Judge0
  instance)
- `JUDGE0_API_KEY` - the RapidAPI key from Step 2, sent as `X-RapidAPI-Key` by `src/server/judge0/client.ts`
- `JUDGE0_API_HOST` - `judge0-ce.p.rapidapi.com` (default if unset)
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `BETTER_AUTH_SECRET` - A secure random string for authentication
- `BETTER_AUTH_URL` - the app's exact public URL (e.g. `https://<your-app>.up.railway.app`, no trailing slash).
  better-auth reads this env var itself (`node_modules/better-auth/dist/utils/url.mjs`) to compute the origin it
  trusts; without it, it falls back to the request's internal URL, which doesn't match the public origin the
  browser sends — every sign-in then fails client-side with a generic "Correo o contraseña incorrectos" while
  the actual network response is `403 {"message":"Invalid origin","code":"INVALID_ORIGIN"}`.
- `BREVO_API_KEY` / `BREVO_CORREO_REMITENTE`: credenciales de Brevo (ver Task 4) para enviar el correo de bienvenida con usuario y contraseña a cada participante registrado manualmente.
- Ya no se usa login OAuth (Google/GitHub): las cuentas las crea el administrador desde `/admin/participantes`, con correo + contraseña generada.

### Step 5: Run Database Migrations

1. In the app service settings, set the **Deploy Command** to:
   ```bash
   npx drizzle-kit push && npm run start
   ```
2. This runs migrations against the production database before the app starts

### Step 6: Deploy and Verify

1. Trigger a deploy from the Railway dashboard
2. Once live, verify the deployment:
   - Visit the app's public URL
   - Log in with an existing admin credential
   - Go to `/admin/participantes` and create a test participant (email, name, categoria, carnet)
   - Verify the `usuario` row appears in the Railway MySQL console with the expected `categoria`
   - Confirm the welcome email with credentials arrives via Brevo, or, if email delivery fails, confirm the credentials are shown in the admin UI as a fallback
   - Log out and log in as the test participant using the emailed/shown email + password
   - Navigate to `/problemas`
   - Submit a solution (e.g., "print hello") for a problem with matching test cases
   - Confirm the verdict returns `aceptado`
   - Verify Claude feedback appears within a few seconds

These checks confirm:

- Database connectivity and migration success
- Brevo transactional email delivery
- Email+password authentication
- Judge0 connectivity (code execution)
- Anthropic API integration (feedback generation)

## Creating Admin Accounts Manually

Admin accounts (`usuario.rol = 'admin'`) are created directly in the database, not through the registration screen. Since `usuario.categoria` is `NOT NULL` (values: `invitado`, `junior`, `senior`), you must still supply a value even though `categoria` has no real meaning for an admin — it only drives participant-facing grouping (e.g. problem filtering by `problemas.grupo`). Use `'senior'` as the conventional placeholder value for admin rows.
