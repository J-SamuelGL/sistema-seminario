# Railway Deployment Guide

This document outlines the steps to deploy the Torneo de Programación application to Railway.

## Prerequisites

- Railway account and CLI access
- GitHub repository connected to Railway
- A separate small VPS with Docker (DigitalOcean/Hetzner/Linode/Vultr/AWS Lightsail) for Piston — see Step 2;
  Railway cannot host it
- Environment variables ready (see `.env.example`)

## Deployment Steps

### Step 1: Create the MySQL Service

1. In the Railway dashboard, create a new project
2. Add a **MySQL** plugin to the project
3. Note the generated `DATABASE_URL` (Railway exposes it as a reference variable, e.g. `${{MySQL.DATABASE_URL}}`)

### Step 2: Deploy Piston on a separate VPS (not on Railway)

**Piston cannot run as a Railway service.** Its sandbox (`isolate`) needs a `privileged` container to create
cgroups/namespaces — `docker-compose.yml` at the repo root already runs it with `privileged: true` for local
dev. Railway categorically prohibits privileged containers and Docker-in-Docker on every plan tier (Trial,
Hobby, Pro, Enterprise) as a deliberate platform-wide security measure — confirmed against Railway's own
[open feature request](https://station.railway.com/feedback/allow-services-to-be-run-in-privileged-m-8c66b22b)
(still unimplemented). Deploying the plain `ghcr.io/engineer-man/piston` image as a Railway Docker-image
service crash-loops immediately with `mkdir: cannot create directory 'isolate/': Read-only file system`.

Instead, run it on any small VPS with Docker (DigitalOcean, Hetzner, Linode, Vultr, AWS Lightsail — any Ubuntu
22.04+ image works identically, ~$5–6/mo is plenty):

1. Provision the VPS, SSH in, and install Docker + the Compose plugin (e.g. via Docker's official
   `get-docker.sh` convenience script).
2. Copy `docs/piston-vps/` (`docker-compose.yml`, `Caddyfile`, `.env.example`) to the VPS, e.g.:
   ```bash
   scp -r docs/piston-vps root@<vps-ip>:/opt/piston
   ```
3. On the VPS, `cd /opt/piston`, copy `.env.example` to `.env`, and set:
   - `PISTON_API_KEY` — a long random secret (e.g. `openssl rand -hex 32`). Piston's own HTTP API has **no
     authentication**, so this stack puts a [Caddy](https://caddyserver.com/) reverse proxy in front that
     only forwards requests carrying a matching `X-Piston-Api-Key` header (see `Caddyfile`) — without it,
     anyone who finds the VPS's IP gets free arbitrary code execution. `docker-compose.yml` in this directory
     does **not** publish Piston's port 2000 to the host at all (only `expose`s it inside the Docker network),
     so the proxy is the only way in.
   - `SITE_ADDRESS` — leave as `:80` to serve over plain HTTP by IP, or set it to a domain name (with DNS
     already pointed at the VPS) to get automatic HTTPS from Caddy instead.
4. `docker compose up -d`
5. Set `PISTON_RUN_TIMEOUT=5000` — already set as a fixed env var on the `piston` service in
   `docs/piston-vps/docker-compose.yml`, no action needed. (Piston's own default is `3000`ms, but
   `src/server/piston/client.ts` requests `run_timeout: 5000` on every execution — without this override,
   Piston rejects every submission with `400 run_timeout cannot exceed the configured limit of 3000`.)

Verified end-to-end on a live DigitalOcean droplet: proxy returns 403 without the header, executes real code
with it. Do a smoke test from your machine after standing up your own VPS:

```bash
curl -X POST https://<vps-ip-or-domain>/api/v2/execute \
  -H "Content-Type: application/json" -H "X-Piston-Api-Key: <your-key>" \
  -d '{"language":"python","version":"3.10.0","files":[{"content":"print(1)"}]}'
# should return {"run":{"stdout":"1\n", ...}}; without the header it should 403
```

### Step 3: Install Language Runtimes

The `scripts/install-piston-languages.sh` script handles language runtime installation. It talks to Piston's
`/api/v2/packages` endpoint directly, so it needs the same `X-Piston-Api-Key` header the proxy requires — pass
it via `curl`'s env-var-friendly `-H` flag by exporting it, or install directly from the VPS bypassing the
proxy (simplest, since the proxy adds nothing but the auth check):

```bash
chmod +x scripts/install-piston-languages.sh
./scripts/install-piston-languages.sh http://localhost:2000   # run this ON the VPS, over SSH
```

The script installs Python, JavaScript, Java, C# and PHP runtimes (see `scripts/install-piston-languages.sh` for exact pinned versions).

Two gotchas hit when running this for real:

- If `scripts/install-piston-languages.sh` was checked out on Windows and `scp`'d over, it may have CRLF line
  endings, which breaks its shebang (`/usr/bin/env: 'bash\r': No such file or directory`). Fix with
  `sed -i 's/\r$//' install-piston-languages.sh` on the VPS, or run it explicitly via `bash install-piston-languages.sh ...`.
- `http://localhost:2000` only works if Piston's port is published to the host. This directory's
  `docker-compose.yml` deliberately does **not** do that (`expose`, not `ports` — see Step 2), so
  `localhost:2000` from the VPS shell gets `Connection refused`. Since the `piston` container itself has no
  `curl`, install from a throwaway container on the same Docker network instead:
  ```bash
  docker run --rm --network piston_default curlimages/curl -sf -X POST http://piston:2000/api/v2/packages \
    -H "Content-Type: application/json" -d '{"language":"python","version":"3.10.0"}'
  # repeat per package; see scripts/install-piston-languages.sh for the full list
  ```

Note: all five language/version pairs have been confirmed against a real Piston instance via `GET /api/v2/packages` and `POST /api/v2/execute`. One quirk to be aware of: the _package_ names used to install JavaScript and C# support are `node` and `mono` respectively (as used by this script); `javascript`/`csharp` are only valid as execution-time aliases in `POST /api/v2/execute`, not as install-time package names.

### Step 4: Create the Main App Service

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

### Step 5: Configure Environment Variables

Set the following environment variables on the app service:

- `DATABASE_URL` - Reference to the MySQL plugin: `${{MySQL.DATABASE_URL}}`
- `PISTON_URL` - the VPS's public address from Step 2, e.g. `http://<vps-ip>` or `https://<your-domain>`
  (**not** `piston.railway.internal` — Piston isn't on Railway; see Step 2)
- `PISTON_API_KEY` - the same secret set in `docs/piston-vps/.env` on the VPS, so `src/server/piston/client.ts`
  sends the header the Caddy proxy requires
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `BETTER_AUTH_SECRET` - A secure random string for authentication
- `BREVO_API_KEY` / `BREVO_CORREO_REMITENTE`: credenciales de Brevo (ver Task 4) para enviar el correo de bienvenida con usuario y contraseña a cada participante registrado manualmente.
- Ya no se usa login OAuth (Google/GitHub): las cuentas las crea el administrador desde `/admin/participantes`, con correo + contraseña generada.

### Step 6: Run Database Migrations

1. In the app service settings, set the **Deploy Command** to:
   ```bash
   npx drizzle-kit push && npm run start
   ```
2. This runs migrations against the production database before the app starts

### Step 7: Deploy and Verify

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
- Piston service connectivity (code execution)
- Anthropic API integration (feedback generation)

## Creating Admin Accounts Manually

Admin accounts (`usuario.rol = 'admin'`) are created directly in the database, not through the registration screen. Since `usuario.categoria` is `NOT NULL` (values: `invitado`, `junior`, `senior`), you must still supply a value even though `categoria` has no real meaning for an admin — it only drives participant-facing grouping (e.g. problem filtering by `problemas.grupo`). Use `'senior'` as the conventional placeholder value for admin rows.
