# Ventajas y desventajas — diseño

## Contexto

Feature nueva para el torneo: a cada participante se le asigna, al azar, una "ventaja" (invitado/junior)
o una "desventaja" (senior). La aplicación real ocurre fuera del sistema (en la sala); el sistema solo
asigna y registra quién/a quién/cuándo. No hay flujo de "submit", solo registro por parte del admin.

## Catálogo de beneficios (dato estático, no en BD)

`src/shared/beneficios.ts` — 13 ítems fijos, cada uno con `clave`, `texto`, el pool (`ventaja` |
`desventaja`) y su `tipoObjetivo` (`ninguno` | `participante` | `ingeniero`).

**Ventajas** (asignadas a categoría `invitado` y `junior`):

| clave               | texto                                                                     | tipoObjetivo  |
|---------------------|----------------------------------------------------------------------------|---------------|
| `busqueda_google`   | Una búsqueda en Google                                                     | ninguno       |
| `ver_codigo`        | Ver el código de alguien más a su elección (solo un minuto)                | participante  |
| `borrar_codigo`     | Borrar una porción del código de alguien más (una línea máx. o una palabra) | participante  |
| `consultar_ingeniero` | Consultar a un ingeniero (minuto y medio)                                 | ingeniero     |
| `nada`              | Nada                                                                       | ninguno       |
| `cupon_premio`      | Cupón o premio inmediato                                                   | ninguno       |
| `prompt_ia`         | Un prompt a una IA (solo un minuto para escribirlo y leerlo)               | ninguno       |

**Desventajas** (asignadas a categoría `senior`):

| clave              | texto                                                    | tipoObjetivo  |
|--------------------|-----------------------------------------------------------|---------------|
| `salir_caminar`    | Salir a dar una vuelta                                     | participante  |
| `reiniciar_compu`  | Reiniciar la compu de alguien más                          | participante  |
| `poner_cancion`    | Ponerle una canción a alguien (máximo 5 minutos de largo)  | participante  |
| `voltear_pantalla` | Voltearle la pantalla a alguien más (5 minutos)            | participante  |
| `atar_mano`        | Atarle la mano dominante a alguien (5 minutos)             | participante  |
| `letra_chiquita`   | Hacer chiquita la letra del IDE de alguien (5 minutos)     | participante  |

`INGENIEROS`: array de nombres hardcodeado en el mismo archivo, con placeholders (`'Ingeniero 1'`,
`'Ingeniero 2'`) — se reemplaza en el código antes de cada torneo con los nombres reales; no hay tabla
ni pantalla de administración para esto.

Regla especial: un participante que ya fue **objetivo** de una desventaja usada (cualquiera de las 6
claves de desventaja) no puede volver a ser objetivo de otra desventaja.

## Esquema de datos

Tabla nueva `beneficios` en `src/server/db/schema.ts`:

- `id` (pk, uuid)
- `usuarioId` (FK `usuarios`, **único** — un beneficio por participante, `onDelete: cascade`)
- `clave` (`mysqlEnum` sobre las 13 claves del catálogo)
- `asignadoEn` (timestamp, default now)
- `usadoEn` (timestamp, nullable)
- `objetivoUsuarioId` (FK `usuarios`, nullable, `onDelete: set null`)
- `objetivoIngeniero` (`mysqlEnum` sobre `INGENIEROS`, nullable — **no** es FK, es un enum directo)

No hay tabla `ingenieros`. No hay `torneoId` en `beneficios` (igual que `envios`/`corridas`, se llega al
torneo vía `usuarios.torneoId`).

## Asignación automática

En `iniciarTorneo` (`src/server/functions/tournament.ts`), después de fijar `iniciadoEn`: para cada
`usuario` con `rol: 'participante'` del torneo que no tenga ya fila en `beneficios`, se elige al azar una
`clave` del pool correspondiente a su `categoria` (`invitado`/`junior` → ventajas, `senior` →
desventajas) y se inserta la fila (`asignadoEn: now`). Como `iniciarTorneo` solo puede ejecutarse una vez
por torneo (`asegurarNoIniciado`), no hace falta lógica de idempotencia adicional más allá del filtro "sin
fila todavía".

La asignación persiste en la base de datos de inmediato — no depende de sesión de navegador ni de que el
participante tenga la app abierta.

## Registrar uso (admin, dentro de `/admin/participantes`)

Server function nueva `registrarUsoBeneficio({ usuarioId, objetivoUsuarioId?, objetivoIngeniero? })`:

- Requiere admin.
- Busca la fila de `beneficios` por `usuarioId`; si no existe, error.
- Valida que el campo objetivo enviado coincida con el `tipoObjetivo` de la `clave` asignada:
  - `ninguno` → no debe venir ningún objetivo.
  - `participante` → debe venir `objetivoUsuarioId`, debe existir, pertenecer al torneo actual, y no ser
    el propio `usuarioId`.
  - `ingeniero` → debe venir `objetivoIngeniero`, uno de los valores de `INGENIEROS`.
- Si la `clave` es una de las 6 desventajas: valida que `objetivoUsuarioId` no sea ya objetivo de **otra**
  fila de `beneficios` con clave de desventaja y `usadoEn` no nulo (excluyendo la propia fila, para poder
  corregir un registro ya hecho).
- Hace upsert de `usadoEn = now()` + los campos de objetivo. Se puede volver a llamar para corregir un
  registro ya marcado (no hay "des-marcar", solo sobreescribir).

`obtenerParticipantes` (`src/server/functions/participantes.ts`) se extiende con un left-join a
`beneficios` (+ nombre del `objetivoUsuarioId` si aplica) para traer `clave`, `usadoEn`,
`objetivoUsuarioId`/nombre, `objetivoIngeniero` por participante.

`/admin/participantes` gana:
- Columna "Beneficio": texto de la `clave` asignada.
- Columna "Uso": si no usado, formulario inline/modal para registrar (selector de participante o de
  ingeniero según `tipoObjetivo`, o solo un botón si es `ninguno`); si ya usado, muestra fecha y el
  objetivo (nombre de participante o ingeniero, si aplica).

## Vista del participante (`/perfil`)

Nueva tarjeta (solo si tiene beneficio asignado, mismo estilo visual que la tarjeta de check-in
existente): muestra el texto de su ventaja/desventaja y, si ya fue usada, un indicador simple ("Ya se
aplicó" + fecha) — sin mostrar el objetivo.

Requiere una query nueva de solo lectura (`obtenerBeneficioPropio`, `requerirUsuario`) que devuelve el
beneficio del usuario autenticado o `null`.

## Fuera de alcance

- No se toca el panel de historial de torneos — los beneficios no aparecen ahí.
- No hay reversión de `usadoEn` a `null`.
- `eliminarParticipante` no necesita lógica nueva (cascade ya cubre `beneficios.usuarioId`).
- No hay pantalla ni tabla para administrar ingenieros — es un array hardcodeado que se edita en código.

## Testing

- Unit test de la lógica de asignación aleatoria (pool correcto según categoría, no reasigna si ya
  existe fila).
- Unit test de `registrarUsoBeneficio`: validación de tipoObjetivo, regla de no-repetición de objetivo de
  desventaja, exclusión de la propia fila al corregir.
- No se prueba UI vía browser automation (según convención del proyecto) — se prueba manualmente.
