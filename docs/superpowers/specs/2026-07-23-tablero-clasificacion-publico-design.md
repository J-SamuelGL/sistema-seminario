# Tablero de clasificación público — diseño

## Contexto

`/clasificacion` hoy vive bajo `_app` (exige sesión) y solo muestra tres tablas de puntos por
categoría. Se busca ampliarla a un tablero más completo — filtros, uso de ventajas/desventajas,
progreso agregado por problema, actividad en vivo — pensado para verse **tanto proyectado en
pantalla compartida durante el torneo como en el dispositivo personal de cada participante**, y
para que sea accesible **sin necesidad de cuenta**.

## Alcance de datos públicos

Todo el contenido de esta página (nombres, puntos, ventajas/desventajas usadas y contra quién,
problema que cada quien está resolviendo, intentos de IA restantes) queda visible sin
autenticación — no hay panel restringido a usuarios logueados. Esto no amplía la superficie de
exposición real: `obtenerClasificacion` y `obtenerEstadoTorneo` ya son server functions sin
`requerir*`, alcanzables sin sesión a nivel de red hoy; lo único que cambia es que la ruta deja de
redirigir a `/` a los visitantes anónimos.

## Routing

- Se mueve `src/routes/_app/clasificacion.tsx` → `src/routes/clasificacion.tsx` (fuera de `_app`,
  sin `beforeLoad` de auth).
- Se reutiliza `NavbarParticipante` sin cambios: ya maneja el caso `usuario === null` con una barra
  mínima (logo + nombre del evento), construida originalmente para `usuarioActualOpcionalQueryOptions`.
  Usuarios logueados siguen viendo su navbar completa.
- El loader de la nueva ruta pide `clasificacionQueryOptions()`, `usuarioActualOpcionalQueryOptions()`
  (para resaltar la fila propia si hay sesión), `estadoTorneoQueryOptions()` (para el countdown) y las
  query options nuevas descritas abajo.

## Datos nuevos (server functions públicas, sin `requerir*`)

Todas viven como funciones de agregación en `src/server/standings/` (junto a `calculate.ts`/`datos.ts`
existentes) y se exponen vía `createServerFn` en `src/server/functions/leaderboard.ts`. Refetch en el
cliente en el mismo intervalo que hoy usa `clasificacionQueryOptions` (3s) — la escala del torneo
(~30 participantes) no justifica intervalos escalonados por panel.

- **`obtenerActividadReciente`** — últimos ~15 `envios` (ya representan "resuelto", sea automático
  o `aprobado_manual`) ordenados por `creadoEn` desc, join a nombre de usuario + título de problema.
- **`obtenerBeneficiosUsados`** — todas las filas de `beneficios` join a nombre del usuario dueño y
  nombre del objetivo (`objetivoUsuarioId`) o `objetivoIngeniero`; mismo shape de datos que ya arma
  `BeneficioAdminCelda`/`obtenerParticipantes`, aquí solo de lectura.
- **`obtenerEstadisticasProblemas`** — por `problema`: cantidad de elegibles de su `grupo` (participantes
  con `categoria` en `invitado`+`junior` para `invitado_junior`, o `senior` para `senior`) vs. cantidad
  que ya lo resolvió (`envios` en `completado`/`aprobado_manual`); y intentos totales acumulados
  (`corridas.contador`) vs. tasa de aciertos, para derivar:
  - Resuelto por todos (resueltos === elegibles).
  - Resuelto por nadie (resueltos === 0).
  - "En llamas": el problema con más intentos y menor tasa de aciertos, uno por `grupo`.
- **`obtenerActividadEnVivo`** — por usuario, su `corrida` con `ultimaEjecucionEn` más reciente si cae
  dentro de los últimos 10 minutos, con el título del problema asociado. Usuarios sin corrida en esa
  ventana simplemente no aparecen en el resultado.
- IA restante no necesita función nueva: se agrega `preguntasIaUsadas` (para usuarios
  `categoria: 'invitado'`) al payload que ya arma `obtenerBeneficiosUsados`, y el cliente calcula
  `LIMITE_PREGUNTAS_IA - preguntasIaUsadas`.

## Countdown

Puramente cosmético, calculado en el cliente: `torneo.iniciadoEn + DURACION_TORNEO_MINUTOS` (constante
nueva, `180`, junto a otras constantes de dominio como `LIMITE_PREGUNTAS_IA`). Cuenta regresiva
mm:ss actualizada cada segundo vía `setInterval` en el componente. Si `torneo.finalizadoEn` está
seteado, se muestra "Concluido" en vez del reloj. **No** dispara ninguna acción (no auto-concluye el
torneo) — `concluirTorneo` sigue siendo una acción manual de admin, sin cambios.

## Filtro de categorías

Pills (invitado/junior/senior), estilo "terminal" oscuro (ver sección de estilo), las 3 activas por
defecto. Es un filtro global — no solo afecta las tablas de puntos:

- Tabla de esa categoría → se oculta si su pill está apagada; con menos de 3 tablas activas, las
  restantes ocupan más ancho en vez de dejar espacio vacío.
- Beneficios usados, feed de actividad reciente, quién-resuelve-qué, IA restante → filtrados por
  `usuario.categoria` en el set de pills activas.
- Resueltos-por-todos/nadie y "problema en llamas" están agrupados por `grupo`, no por categoría 1-a-1:
  `invitado_junior` se muestra si `invitado` **o** `junior` sigue activa; `senior` se muestra si
  `senior` sigue activa.

Estado del filtro vive en el componente de la página (no en URL/localStorage — no hace falta
persistir entre visitas).

## Panels — componentes nuevos

- `FiltroCategorias` — pills descritas arriba.
- `CountdownTorneo` — reloj descrito arriba.
- `LeaderboardTable` (existente, extendido): cada fila desde la 2ª muestra la brecha con el líder
  (`-120 pts / +8 min vs. líder`), calculada en el cliente a partir de `FilaClasificacion[0]` — no
  requiere datos nuevos del backend.
- `ActividadRecienteFeed` — ticker vertical compacto ("Fulano · Problema X · hace 2m").
- `BeneficiosUsadosPanel` — lista de participantes con beneficio asignado: clave (texto del catálogo),
  si ya se usó, y contra quién/qué ingeniero si aplica. Reutiliza los textos de `CATALOGO_BENEFICIOS`.
- `ProblemasEstadisticasPanel` — dos listas cortas (resueltos por todos / por nadie), truncadas a N
  ítems con "+X más" si hay muchos problemas.
- `ProblemaEnLlamasPanel` — un problema destacado por grupo.
- `ActividadEnVivoPanel` — lista de participantes con corrida en los últimos 10 min y el problema
  asociado.
- `IaRestantePanel` — solo participantes `invitado`, con su cupo restante.

Cada panel es una `CARD` independiente; si no tiene datos (ej. nadie ha usado su beneficio todavía),
muestra su propio estado vacío en vez de desaparecer, para no romper el layout del grid.

## Layout

- Header: título (igual que hoy) + fila de controles debajo (`FiltroCategorias` a la izquierda,
  `CountdownTorneo` a la derecha; en pantallas angostas el countdown pasa debajo, sin comprimirse).
- Fila principal: tablas de categoría filtradas, `grid-cols-1 lg:grid-cols-{n}` según cuántas pills
  sigan activas (1, 2 o 3).
- Fila secundaria: grid responsivo (1 columna en mobile, 2-3 en desktop/proyector) con las tarjetas de
  los paneles nuevos — se auto-acomodan, no dependen de que las 6 tarjetas siempre estén presentes.
- Sin tabs ni navegación interna: una sola página scrolleable, para que funcione igual de bien
  proyectada que en dispositivo personal.

## Estilo visual

Todo el módulo nuevo (y por extensión, esta página completa) adopta el lenguaje "terminal" oscuro
tipo Elden Ring que ya existe en `RunResults`/`BUTTON_TERMINAL_*`/`LOGRO_TEXT_TERMINAL` (fondo casi
negro, bordes con resplandor, tipografía display en mayúsculas small-caps) — reemplazando el estilo
"papel claro" que `LeaderboardTable` usa hoy. Las pills de filtro y el countdown siguen ese mismo
lenguaje en vez de introducir uno nuevo.

## Fuera de alcance

- No hay persistencia del filtro de categorías entre visitas (ni URL param ni localStorage).
- El countdown no afecta el estado real del torneo — es solo visual.
- No se agrega columna de duración configurable a `torneos`; `DURACION_TORNEO_MINUTOS` es una
  constante en código.
- No hay paginación real en los paneles truncados ("+X más" es solo un contador, no un link a más
  detalle).
- No se toca `/admin/participantes` ni `BeneficioAdminCelda` — los paneles nuevos son de solo lectura,
  independientes del flujo de registro de uso que ya existe ahí.

## Testing

- Unit tests de las nuevas funciones de agregación en `src/server/standings/` (estadísticas por
  problema, ventana de actividad en vivo de 10 min, filtrado por grupo/categoría) — mismo patrón que
  los tests existentes de `calculate.ts`.
- No se prueba UI vía browser automation (según convención del proyecto) — se prueba manualmente,
  incluyendo verificar que la ruta responde sin sesión iniciada.
