# Torneo de Programación

App para correr un torneo/seminario de programación competitiva en vivo, construida con TanStack Start
(React 19, SSR). Los participantes inician sesión, se registran vía QR ("check-in"), resuelven problemas
enviando código en uno de cinco lenguajes, son calificados contra casos de prueba ejecutados vía la API de
[Judge0 CE](https://rapidapi.com/judge0-official/api/judge0-ce) (RapidAPI), y aparecen en una tabla de
posiciones en vivo. La categoría "invitado" recibe pistas/feedback generado con Claude.

Para el detalle de arquitectura (pipeline de calificación, auth, ciclo de vida del torneo, etc.) ver
[`CLAUDE.md`](./CLAUDE.md). Los specs/plans originales de cada feature están en `docs/superpowers/`.

## Requisitos previos

- Node.js y npm
- Un MySQL accesible (local o remoto) para `DATABASE_URL`
- Una API key de Judge0 CE en RapidAPI (plan Basic, "pay per use", sin costo mensual fijo — ver
  `docs/deployment.md`)

## Configuración inicial

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env.example` a `.env` y completar las variables (`DATABASE_URL`, `ANTHROPIC_API_KEY`,
   `BETTER_AUTH_SECRET`, `BREVO_API_KEY`, `BREVO_CORREO_REMITENTE`, `JUDGE0_API_KEY`).

3. Aplicar el esquema a la base de datos:

   ```bash
   npx drizzle-kit push
   ```

4. Levantar la webapp:

   ```bash
   npm run dev
   ```

   Queda disponible en `http://localhost:3000`.

Las cuentas de participantes no se crean por auto-registro: un admin las provisiona desde
`/admin/participantes` (ver `CLAUDE.md`). Las cuentas admin se siembran directo en la base de datos.

## Scripts disponibles

| Script                    | Descripción                                                                    |
| ------------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`             | Levanta la webapp en `:3000`                                                   |
| `npm run build`           | Build de producción                                                            |
| `npm run start`           | Corre el build de producción (usado por Railway)                               |
| `npm run test`            | Corre los tests con Vitest                                                     |
| `npm run lint`            | Lint con ESLint                                                                |
| `npm run format`          | Formatea con Prettier y corrige lint                                           |
| `npm run check`           | Verifica formato sin escribir cambios                                          |
| `npm run generate-routes` | Regenera `src/routeTree.gen.ts` (normalmente automático vía el plugin de Vite) |

## Testing

Los tests que tocan la base de datos corren contra un MySQL real — `DATABASE_URL` debe apuntar a un MySQL
levantado. Los tests de `tests/judge0-*.test.ts` y `tests/judge.test.ts` mockean `fetch`/`ejecutarJudge0`, no
necesitan una key real de Judge0. El comportamiento de UI no se prueba con automatización de navegador; eso
se valida manualmente.

```bash
npm run test
npx vitest run tests/judge.test.ts   # un solo archivo
```

## Deploy

Ver [`docs/deployment.md`](./docs/deployment.md) para la guía de deploy a Railway (incluye cómo se
obtiene la API key de Judge0 CE en RapidAPI, variables de entorno y verificación post-deploy).
