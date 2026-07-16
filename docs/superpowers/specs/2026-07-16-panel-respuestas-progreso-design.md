# Panel de respuestas y seguimiento de progreso por problema

## Problema

Hoy, `/admin/envios` es una lista plana de todos los envíos (uno por cada click en "Submit"),
sin agrupar por participante ni por categoría, y su página de detalle solo permite aprobar o
revertir un envío individual. No hay forma de ver, por participante, cuántos problemas le
quedan, cuántos completó, su punteo o su posición en la clasificación — hay que cruzar varias
pantallas mentalmente.

Además, el flujo actual persiste un `envio` en cada click de "Submit" (correcto o no), lo cual
ensucia la tabla `envios` con intentos fallidos y hace que la penalización de puntaje dependa de
contar esos intentos. Se quiere simplificar: que el progreso "en construcción" de un participante
no se persista como intento oficial hasta que sea correcto o hasta que el torneo termine, momento
en el cual se debe poder revisar el avance de todos, hayan acertado o no.

## Objetivo

1. Eliminar el botón "Submit" de la resolución de problemas — "Run" pasa a ser el único camino
   de calificación.
2. Cuando un "Run" resulta en veredicto `aceptado` por primera vez para un problema, se guarda
   automáticamente como completado — sin acción explícita del participante.
3. Cuando el torneo concluye, se guarda el progreso de **todos** los participantes en todos los
   problemas que llegaron a correr, aunque no los hayan resuelto.
4. Renombrar `/admin/envios` a `/admin/respuestas`. La página lista los participantes que
   asistieron (`ingresadoEn` no nulo), agrupados por categoría, con sus métricas de progreso.
5. Al hacer click en un participante, se ve el detalle de todos los problemas asignados a su
   grupo con su estado, duración estimada, y un control para que el admin cambie el estado
   manualmente.

## No objetivos

- No se toca el flujo de "Run" en sí (ejecución contra Piston, consola separada de
  `MARCADOR_RESULTADO_JUEZ`, etc.) más que agregar la validación de torneo iniciado/no finalizado
  y el guardado del snapshot de progreso.
- No se rediseña `/clasificacion` (el leaderboard público) — solo cambia la fórmula interna que
  ya consume (`calcularClasificacion`).
- No se migran datos existentes: la base de datos actual es de prueba, se puede alterar
  `envios`/`corridas` libremente sin preservar filas.
- El comentario automático de Claude sobre un envío (`comentarioClaude`, distinto del hint
  periódico cada 3 Runs) se elimina por completo, no se reubica.

## Modelo de datos

### `envios` — pasa de "una fila por intento" a "una fila por (usuario, problema)"

- Se agrega una restricción única sobre `(usuarioId, problemaId)`.
- Se agrega `estadoProgreso`: `mysqlEnum(['pendiente', 'completado', 'aprobado_manual'])`,
  `NOT NULL DEFAULT 'pendiente'`. Es el estado que ve el admin y el que determina si el problema
  cuenta como resuelto para efectos de puntaje/conteo.
- `estado` se mantiene (el veredicto técnico de Piston: `aceptado` / `respuesta_incorrecta` /
  `error_ejecucion` / `tiempo_excedido` / `pendiente`) — ahora es solo informativo del último
  resultado de calificación conocido, ya no determina el conteo de resueltos.
- `codigo`, `lenguaje`, `resultados` se mantienen — snapshot del intento relevante (el que hizo
  que la fila se creara o se actualizara).
- `creadoEn` se reinterpreta como "momento en que se resolvió" — es el timestamp que usan el
  cálculo de penalización y de duración. Solo se actualiza cuando `estadoProgreso` pasa a
  `completado` o `aprobado_manual` (ver sección de disparadores). No se toca al volver a
  `pendiente`.
- `aprobadoPorId` / `aprobadoEn` se mantienen como auditoría: se fijan cada vez que un admin
  cambia `estadoProgreso` manualmente a cualquiera de los 3 valores (incluido volver a
  `pendiente`).
- Se elimina `veredictoOriginal` (ya no hay un flujo separado de "revertir aprobación"; el admin
  simplemente vuelve a elegir el estado que quiera).
- Se elimina `comentarioClaude` (columna muerta tras quitar el feedback automático en Submit).

### `corridas` — pasa de "contador de hints" a también guardar el último snapshot de Run

Se agregan columnas, actualizadas en **cada** Run sin importar la categoría del usuario (hoy solo
se tocaba para `invitado`):

- `ultimoCodigo` (text)
- `ultimoLenguaje` (mismo enum que `problema_lenguajes.lenguaje`)
- `ultimoVeredicto` (mismo enum que `envios.estado`)
- `ultimosResultados` (json, mismo tipo que `envios.resultados`)
- `ultimaEjecucionEn` (timestamp)

`contador` sigue existiendo con el mismo propósito (cadencia de hints), pero ahora se incrementa
en cada Run de cualquier categoría; la lógica de `debeMostrarHint` solo se consulta para
`invitado`, sin cambios en `hintCadence.ts`.

## Disparadores (cuándo se crea/actualiza una fila de `envios`)

### 1. Run (`ejecutarCodigo`, `src/server/functions/run.ts`)

1. Se agrega la validación `asegurarIniciado` (torneo iniciado y no finalizado) — hoy Run no
   tiene ninguna validación de estado de torneo.
2. Se califica contra Piston como hoy.
3. Se hace upsert de la fila de `corridas` para `(usuarioId, problemaId)`: snapshot de
   código/lenguaje/veredicto/resultados/`ultimaEjecucionEn = now()`, `contador + 1`. Esto ocurre
   para todas las categorías.
4. Solo para `invitado`: se evalúa `debeMostrarHint(contador)` igual que hoy, usando el
   `contador` recién actualizado.
5. **Si el veredicto es `aceptado` y no existe todavía una fila en `envios` para
   `(usuarioId, problemaId)`**: se inserta una con `estadoProgreso = 'completado'`,
   `creadoEn = now()`, y el snapshot de código/lenguaje/resultados/estado de este Run. Si ya
   existe una fila (en cualquier estado — ya completada antes, o ya tocada por un admin), Run
   nunca la sobreescribe. Esto preserva "el primer acierto cuenta" y nunca pisa una decisión
   manual del admin.

### 2. Cambio manual de estado (admin, nueva función de servidor)

El admin elige libremente cualquiera de los 3 valores de `estadoProgreso` para un
`(usuarioId, problemaId)` desde la página de detalle:

1. Se lee la fila de `corridas` de ese par (si existe) para tomar el snapshot de
   código/lenguaje/veredicto/resultados.
2. Se hace upsert de la fila de `envios`: `estadoProgreso` = valor elegido,
   `aprobadoPorId` = admin actual, `aprobadoEn = now()` (siempre, sin importar el valor elegido).
3. `creadoEn` solo se actualiza si el nuevo valor es `completado` o `aprobado_manual`: se fija a
   `corridas.ultimaEjecucionEn` (o `now()` si el participante nunca corrió ese problema — caso
   borde de un admin aprobando algo sin ningún Run registrado). Si el nuevo valor es `pendiente`,
   `creadoEn` no se toca.

### 3. Fin de torneo (`concluirTorneo`, `src/server/functions/tournament.ts`)

Después de fijar `finalizadoEn`, para cada fila de `corridas` que no tenga todavía una fila
correspondiente en `envios`, se inserta una: `estadoProgreso = 'pendiente'`,
`creadoEn = ultimaEjecucionEn`, y el snapshot de código/lenguaje/veredicto/resultados de esa
fila de `corridas`. Esto persiste el último código que dejó cada participante en cada problema
que llegó a correr, aunque no lo haya resuelto — sin esto, ese código nunca habría llegado a la
base de datos. Problemas que un participante nunca corrió ni una vez no generan fila (no hay
nada que mostrar).

## Puntaje y clasificación (`src/server/standings/calculate.ts`)

- "Resuelto" pasa de `estado === 'aceptado'` a `estadoProgreso ∈ {'completado', 'aprobado_manual'}`.
- Como ahora solo existe una fila de `envios` por `(usuario, problema)`, desaparece la lógica de
  "buscar el primer aceptado entre varios intentos" — se revisa directamente el único
  `estadoProgreso` de esa fila.
- Se elimina el término de penalización por intentos fallidos (`+20 min` por intento antes del
  aceptado). La penalización pasa a ser únicamente los minutos transcurridos entre el inicio del
  torneo y `creadoEn` del envío resuelto.
- `agruparClasificacionPorCategoria` no cambia.

## Duración por problema (nuevo, solo para el detalle de admin)

Nueva función (p. ej. `src/server/standings/duracion.ts`), pura y testeable igual que
`calcularClasificacion`:

- Entrada: `torneoIniciadoEn` y la lista de problemas resueltos por un participante
  (`estadoProgreso` completado o aprobado_manual) con su `creadoEn`.
- Se ordenan por `creadoEn` ascendente.
- Duración del primero = su `creadoEn` − `torneoIniciadoEn`.
- Duración de cada uno después del primero = su `creadoEn` − `creadoEn` del anterior en esa
  secuencia (no el anterior por orden de la lista de problemas, sino el anterior cronológico en
  el que acertó).
- Problemas no resueltos no tienen duración (se muestra "—" en la UI).

## UI de administración

### `/admin/respuestas` (renombrado desde `/admin/envios`)

Lista de participantes:

- Filtro: `rol = 'participante'` y `ingresadoEn` no nulo.
- Agrupados en 3 secciones por categoría (invitado / junior / senior), cada una ordenada por
  posición (mismo criterio que el leaderboard: puntos desc, penalización asc).
- Columnas: Nombre | Completados | Pendientes | Puntos | Puesto | Categoría.
  - Completados = cantidad de problemas de su grupo con `estadoProgreso` completado o
    aprobado_manual.
  - Pendientes = problemas asignados a su grupo (`invitado_junior` o `senior` según su
    categoría) − Completados.
- Click en una fila navega a `/admin/respuestas/$usuarioId`.

### `/admin/respuestas/$usuarioId` (antes keyed por `envioId`, ahora por participante)

- Encabezado: nombre, categoría, puntos totales, puesto.
- Una fila por cada problema asignado al grupo del participante (incluye problemas que nunca
  llegó a correr, mostrados como pendiente sin timestamp ni código):
  - Columnas: Problema (título) | Dificultad | Categoría de problema (debugging/normal) | Estado
    (pill: pendiente/completado/aprobado_manual) | Duración | Enviado en (`creadoEn`, o "—") |
    control de cambio de estado.
  - El control de estado permite al admin elegir libremente entre los 3 valores, con el mismo
    disparador de la sección "Cambio manual de estado" de arriba.
  - Si hay código disponible (existe fila en `envios` o al menos en `corridas`), la fila se puede
    expandir para ver el código y los resultados por caso (reutiliza el render de resultados que
    ya existe en la página de detalle actual).

## Cambios en la resolución de problemas (participante)

- Se elimina el botón "Submit", `enviarCodigo`, `obtenerEnvio` y el archivo
  `src/server/functions/submit.ts` completo.
- Se elimina `src/components/SubmitResult.tsx` y su uso en
  `src/routes/_app/problemas/$problemaId.tsx`.
- Se elimina la llamada a `generarComentarioEnvio` que hoy dispara Submit para `invitado` (el
  hint periódico cada 3 Runs, que usa la misma función, no se toca).
- El botón "Run" pasa a ser el único control de ejecución/calificación en la página.

## Navegación

- `src/components/NavbarAdmin.tsx`: el enlace `/admin/envios` → `Envíos` cambia a
  `/admin/respuestas` → `Respuestas`.

## Archivos que se eliminan

- `src/server/functions/submit.ts`
- `src/components/SubmitResult.tsx`
- `src/server/envios/aprobacion.ts` (reemplazado por la lógica de disparadores de arriba)

## Testing

- `tests/standings/calculate.test.ts` (o el archivo existente que cubra
  `calcularClasificacion`): actualizar para el nuevo criterio de "resuelto"
  (`estadoProgreso`) y la fórmula de penalización sin intentos fallidos.
- Nueva prueba unitaria para la función de duración: primer problema resuelto (torneo →
  primer acierto), segundo problema resuelto (acierto anterior → este), problema no resuelto
  (sin duración), y el caso de que el orden cronológico de aciertos no coincida con el orden de
  los problemas en la lista.
- Actualizar/crear pruebas para la lógica de disparadores de `envios` en `run.ts`: Run con
  veredicto aceptado crea la fila la primera vez; un segundo Run aceptado no la sobreescribe; Run
  después de `finalizadoEn` es rechazado.
- Prueba para el snapshot de fin de torneo (`concluirTorneo`): crea filas de `envios` en
  `pendiente` solo para pares `(usuario, problema)` con `corridas` pero sin `envios` previo.
- Prueba para el cambio manual de estado: los 3 valores posibles, y que `creadoEn` solo se
  actualiza al pasar a completado/aprobado_manual.
