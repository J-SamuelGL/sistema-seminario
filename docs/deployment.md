# Railway Deployment Guide

This document outlines the steps to deploy the Torneo de Programación application to Railway.

## Prerequisites

- Railway account and CLI access
- GitHub repository connected to Railway
- Environment variables ready (see `.env.example`)

## Deployment Steps

### Step 1: Create the MySQL Service

1. In the Railway dashboard, create a new project
2. Add a **MySQL** plugin to the project
3. Note the generated `DATABASE_URL` (Railway exposes it as a reference variable, e.g. `${{MySQL.DATABASE_URL}}`)

### Step 2: Create the Piston Service

1. Add a new service to the same Railway project
2. Choose "Deploy from Docker Image" with image `ghcr.io/engineer-man/piston`
3. In the service's Networking settings:
   - Do **not** expose a public domain
   - Enable private networking only, which provides an internal address like `piston.railway.internal` on port `2000`

### Step 3: Install Language Runtimes

The `scripts/install-piston-languages.sh` script handles language runtime installation. To use it:

1. Temporarily expose a public domain on the Piston service
2. Run the script:
   ```bash
   chmod +x scripts/install-piston-languages.sh
   ./scripts/install-piston-languages.sh https://<piston-temp-public-url>
   ```
3. Once complete, disable the public domain on the Piston service

The script installs Python 3.10.0 and JavaScript 18.15.0 runtimes.

### Step 4: Create the Main App Service

1. Add a third service, connected to this project's GitHub repository
2. Railway auto-detects the Node app via Nixpacks
3. Confirm the build command resolves to `npm run build` and the start command to `npm run start`
4. Adjust in service settings if necessary

### Step 5: Configure Environment Variables

Set the following environment variables on the app service:

- `DATABASE_URL` - Reference to the MySQL plugin: `${{MySQL.DATABASE_URL}}`
- `PISTON_URL=http://piston.railway.internal:2000` (private network address)
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
