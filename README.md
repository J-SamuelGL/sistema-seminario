# Torneo de Programación

App para correr un torneo/seminario de programación competitiva en vivo, construida con TanStack Start
(React 19, SSR). Los participantes inician sesión, se registran vía QR ("check-in"), resuelven problemas
enviando código en uno de cinco lenguajes, son calificados contra casos de prueba ejecutados en una
instancia sandboxed de [Piston](https://github.com/engineer-man/piston), y aparecen en una tabla de
posiciones en vivo. La categoría "invitado" recibe pistas/feedback generado con Claude.

Para el detalle de arquitectura (pipeline de calificación, auth, ciclo de vida del torneo, etc.) ver
[`CLAUDE.md`](./CLAUDE.md). Los specs/plans originales de cada feature están en `docs/superpowers/`.

## Requisitos previos

- Node.js y npm
- Docker (para levantar Piston localmente)
- Un MySQL accesible (local o remoto) para `DATABASE_URL`

## Configuración inicial

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env.example` a `.env` y completar las variables (`DATABASE_URL`, `ANTHROPIC_API_KEY`,
   `BETTER_AUTH_SECRET`, `BREVO_API_KEY`, `BREVO_CORREO_REMITENTE`). `PISTON_URL` ya viene apuntando a
   `http://localhost:2000`, que es donde queda expuesto el Piston del paso siguiente.

3. Levantar Piston vía Docker Compose:

   ```bash
   npm run dev:piston
   ```

4. **Solo la primera vez** (o si se borra el volumen `piston/packages`), instalar los runtimes de lenguaje
   en esa instancia de Piston:

   ```bash
   npm run piston:install-languages
   ```

5. Aplicar el esquema a la base de datos:

   ```bash
   npx drizzle-kit push
   ```

6. Levantar la webapp:

   ```bash
   npm run dev
   ```

   Queda disponible en `http://localhost:3000`.

Las cuentas de participantes no se crean por auto-registro: un admin las provisiona desde
`/admin/participantes` (ver `CLAUDE.md`). Las cuentas admin se siembran directo en la base de datos.

## Scripts disponibles

| Script                         | Descripción                                                              |
| ------------------------------ | ------------------------------------------------------------------------- |
| `npm run dev`                   | Levanta la webapp en `:3000`                                              |
| `npm run dev:piston`             | Levanta Piston vía Docker Compose (`http://localhost:2000`)                |
| `npm run piston:install-languages` | Instala los runtimes de lenguaje en Piston (solo hace falta una vez)   |
| `npm run build`                 | Build de producción                                                       |
| `npm run start`                  | Corre el build de producción (usado por Railway)                          |
| `npm run test`                   | Corre los tests con Vitest                                                |
| `npm run lint`                   | Lint con ESLint                                                            |
| `npm run format`                  | Formatea con Prettier y corrige lint                                      |
| `npm run check`                  | Verifica formato sin escribir cambios                                     |
| `npm run generate-routes`          | Regenera `src/routeTree.gen.ts` (normalmente automático vía el plugin de Vite) |

## Testing

Los tests de harness/judge (`tests/harness-*.test.ts`, `tests/judge*.test.ts`, `tests/piston-*.test.ts`)
corren contra un MySQL y un Piston reales — `DATABASE_URL` y `PISTON_URL` deben apuntar a servicios
levantados (con Piston ya con los runtimes instalados, ver arriba). El comportamiento de UI no se prueba
con automatización de navegador; eso se valida manualmente.

```bash
npm run test
npx vitest run tests/judge.test.ts   # un solo archivo
```

## Deploy

Ver [`docs/deployment.md`](./docs/deployment.md) para la guía de deploy a Railway (incluye cómo se
configura Piston en producción, variables de entorno y verificación post-deploy).
