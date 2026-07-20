# Soporte para múltiples torneos (uno por año)

## Problema

El sistema modela un único torneo global: una sola fila en `estado_torneo` (`id` fijo en 1),
`usuarios` y `problemas` sin ninguna noción de a qué evento pertenecen. Esto funcionó para el
lanzamiento inicial, pero el torneo se repite cada año en la universidad, y hoy no hay forma de
cerrar la edición de este año y empezar la del próximo sin borrar o mezclar datos: los
participantes, problemas y respuestas de un año quedarían indistinguibles de los del siguiente.

## Objetivo

1. Cada edición anual del torneo es una entidad propia (`torneos`), con su propio conjunto de
   participantes y problemas.
2. Los torneos son secuenciales: solo hay uno "actual" (editable) a la vez — el más recién creado.
   Crear uno nuevo bloquea automáticamente, para siempre, la edición de todos los anteriores.
3. Un admin puede iniciar sesión una sola vez y administrar el torneo actual igual que hoy, y
   además consultar (de solo lectura) los resultados de cualquier torneo pasado.
4. Un participante que compite en más de un año usa una cuenta nueva cada vez — no hay identidad
   ni historial compartido entre torneos — y puede reutilizar el mismo correo real de un año a
   otro sin fricción para el admin que lo registra.

## No objetivos

- No se soportan torneos concurrentes/en paralelo — el modelo es estrictamente secuencial.
- No hay identidad de participante persistente entre torneos (misma persona = cuentas distintas
  cada año, sin vínculo entre ellas).
- No hay clonado/duplicado de problemas entre torneos — cada torneo empieza sin problemas.
- No se modifica el flujo interno de calificación (Judge0, harnesses, veredictos) ni el cálculo de
  clasificación en sí — solo se les agrega el filtro de torneo actual.
- No se toca la lógica de login/lookup interna de better-auth — la unicidad de correo se resuelve
  a nivel de datos (ver "Correos y autenticación"), no interviniendo el adaptador.

## Modelo de datos

### `torneos` (nueva)

```
id         varchar(36) PK, uuid
anio       int NOT NULL UNIQUE
iniciadoEn timestamp NULL
finalizadoEn timestamp NULL
creadoEn   timestamp NOT NULL DEFAULT now()
```

Reemplaza a `estado_torneo`. `iniciadoEn`/`finalizadoEn` cumplen exactamente el mismo rol que
hoy (gating de `asegurarIniciado`/`asegurarNoIniciado`), solo que ahora son por fila en vez de un
singleton `id = 1`.

**Torneo actual** = la fila con `creadoEn` más reciente (`ORDER BY creadoEn DESC LIMIT 1`). No es
un flag almacenado — es siempre una consulta derivada. Se centraliza en una única función, p. ej.
`src/server/tournament/actual.ts` (`obtenerTorneoActual()`), que todo el resto del código usa en
vez de tocar la tabla `torneos` directamente.

### `usuarios` — se agrega `torneoId`

```
torneoId varchar(36) NULL, FK -> torneos.id
```

- `NULL` para `rol = 'admin'` (los admins son globales, no pertenecen a un torneo).
- Obligatorio en la práctica (aunque nullable a nivel de columna) para `rol = 'participante'` —
  se fuerza en el código de creación de participantes, no con un `NOT NULL` de DB, siguiendo el
  mismo patrón que ya usa `categoria` como placeholder para admins.

### `problemas` — se agrega `torneoId`

```
torneoId varchar(36) NOT NULL, FK -> torneos.id
```

Cada problema pertenece a exactamente un torneo. `problema_lenguajes` y `casos_prueba` no
necesitan columna nueva — heredan el scope transitivamente vía `problemaId`.

### Tablas que heredan el scope sin cambios de esquema

`envios`, `corridas`, `preguntas_ia`: ya están scopeadas indirectamente porque `usuarioId` y
`problemaId` ya pertenecen a un torneo una vez que las dos tablas de arriba lo tienen. No se les
agrega `torneoId` propio — evita denormalización sin beneficio real dado que el modelo es
estrictamente secuencial (nunca hay ambigüedad de a qué torneo pertenece un envío).

## Ciclo de vida y bloqueo

- **Crear un torneo nuevo** exige que el torneo actual tenga `finalizadoEn` fijado; si no,
  se rechaza con error (mismo estilo que `asegurarNoIniciado`/`asegurarIniciado`). Acción nueva
  de admin: formulario con un único campo, `anio`.
- **Bloqueo implícito**: en el momento en que se crea un torneo nuevo, el anterior deja
  automáticamente de ser "el actual" y por lo tanto ya no es editable — sin ninguna acción
  manual ni columna de estado adicional.
- **Qué bloquea "no ser el actual"**: crear/editar/eliminar problemas, crear/editar participantes,
  y cambios manuales de `estadoProgreso` en `/admin/respuestas`. Todas las funciones de servidor
  que hoy hacen estas operaciones agregan una guarda `asegurarEsTorneoActual(torneoId)`.
- **Qué NO bloquea "no ser el actual"**: dentro del torneo actual, la edición de respuestas sigue
  permitida después de que concluya (`finalizadoEn` fijado) — igual que hoy. El bloqueo es sobre
  identidad del torneo (¿es el más reciente?), no sobre su estado de conclusión.

## Correos y autenticación

Se decide **no** tocar el adaptador de better-auth (el lookup interno de `/sign-in/email` no es
consciente de torneos, y no vale la pena el riesgo de parchear el camino de login). En su lugar,
`usuarios.email` se mantiene con una restricción `UNIQUE` global exactamente como hoy, y la
reutilización de un correo real de un año a otro se resuelve por dato, no por esquema:

- Se agrega `usuarios.correoOriginal` (text, nullable) — solo se usa para las cuentas archivadas
  (ver abajo); para cuentas activas permanece `NULL` y el correo real vive en `email` como
  siempre.
- **Al crear un torneo nuevo**, como paso de la misma operación, todas las filas de `usuarios` con
  `rol = 'participante'` que pertenecían al torneo que acaba de dejar de ser el actual:
  1. Se copia su `email` actual a `correoOriginal`.
  2. Se reescribe `email` a una forma archivada no reutilizable como login (p. ej.
     `<uuid-corto>+archivado@<dominio-interno>` o similar — un valor garantizado único y que
     nunca coincide con un correo real).
  3. Se invalida su fila de `cuentas` (credential) — p. ej. limpiando el `password` — para que la
     cuenta quede imposible de autenticar aunque alguien conserve la contraseña original.
- Efecto: el correo real vuelve a estar libre inmediatamente para que el admin registre a la
  misma persona el año siguiente, y no se modifica ni un carácter del comportamiento de login de
  better-auth. El historial (`/admin/historial`) muestra `correoOriginal` cuando existe, o `email`
  si la cuenta nunca fue archivada (torneo actual).
- Como el índice único de `email` sigue siendo global, `crearCuentaParticipante` no necesita
  ningún cambio en su chequeo de duplicados (`SELECT ... WHERE email = ...`): una vez que un
  correo fue archivado (mangled), deja de coincidir con el correo real, así que un registro nuevo
  con ese correo real ya no choca. La restricción `UNIQUE` de la DB sigue siendo la única fuente
  de verdad.

## Panel de administración

- `/admin/problemas`, `/admin/participantes`, `/admin/respuestas`: sin cambios de ruta ni de
  comportamiento visible — internamente, cada consulta que hoy lee `usuarios`/`problemas`/
  `envios`/`corridas` sin filtro se re-apunta a `torneoId = torneoActual.id` (usando
  `obtenerTorneoActual()`). El choke point principal es `src/server/standings/datos.ts`
  (`cargarDatosClasificacion`), que hoy consulta las tres tablas sin filtro — pasa a recibir
  (o resolver internamente) el torneo actual.
- **Nueva página `/admin/historial`**: lista los torneos pasados por `anio` desc. Click en uno
  lleva a una vista de solo lectura de su clasificación/resultados (reutiliza los componentes de
  standings existentes, apuntados a ese `torneoId` histórico en vez del actual). Sin ninguna
  acción de edición.
- **Nueva acción "crear torneo"**: formulario de un campo (`anio`), visible en el panel de admin
  (p. ej. junto al control de iniciar/concluir torneo), deshabilitado/con error si el torneo
  actual no está `finalizado`.

## Leaderboard público (`/clasificacion`) y flujo de participante

Sin cambios de comportamiento — ya operan implícitamente sobre "el torneo del usuario logeado"
(su propio `usuarioId` ya pertenece a un solo torneo) o sobre el torneo actual (`/clasificacion`
público). El único cambio es que `cargarDatosClasificacion` y las consultas de problemas por
grupo pasan a filtrar explícitamente por `torneoId` del torneo actual en vez de leer la tabla
entera.

## Migración de datos existentes

La base de datos de producción ya tiene un torneo en curso (fila real en `estado_torneo`, con
`iniciadoEn` fijado). Script de migración de un solo uso, corrido manualmente al desplegar este
cambio (no vía `drizzle-kit push`, que es solo de esquema):

1. `drizzle-kit push` para crear `torneos`, agregar `torneoId` a `usuarios`/`problemas`, y
   `correoOriginal` a `usuarios`.
2. Insertar una fila en `torneos` con `anio = 2026`, copiando `iniciadoEn`/`finalizadoEn` desde la
   fila existente de `estado_torneo`.
3. `UPDATE usuarios SET torneoId = <id del paso 2> WHERE rol = 'participante'`.
4. `UPDATE problemas SET torneoId = <id del paso 2>`.
5. `DROP TABLE estado_torneo`.

## Testing

- `src/server/tournament/actual.ts`: prueba de que `obtenerTorneoActual` devuelve el de
  `creadoEn` más reciente entre varios.
- Guarda `asegurarEsTorneoActual`: acepta el torneo actual, rechaza cualquier otro.
- Creación de torneo: rechaza si el actual no está `finalizado`; encadena correctamente el nuevo
  `creadoEn` posterior.
- Archivado de correos al crear un torneo nuevo: participantes del torneo saliente quedan con
  `email` no colisionable y `correoOriginal` con el valor previo; admins no se tocan.
- `cargarDatosClasificacion`: filtra correctamente por torneo dado, no mezcla datos de dos
  torneos distintos con el mismo `problemaId`/`usuarioId` de prueba en fixtures.
- Registro de participante: permite reusar un correo que ya existe pero pertenece a un torneo
  archivado (email mangled), rechaza si colisiona con uno del torneo actual o con un admin.
