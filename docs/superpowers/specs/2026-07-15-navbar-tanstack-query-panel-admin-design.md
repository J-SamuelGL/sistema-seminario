# Torneo de programación — Navegación, TanStack Query y panel de administración

## Contexto y objetivo

El sistema no tiene ningún elemento de navegación: `__root.tsx` renderiza `{children}` sin más, así
que moverse entre `/perfil`, `/problemas`, `/clasificacion` o cualquier ruta `/admin/*` requiere
teclear la URL a mano, y no existe ningún botón para cerrar sesión. Además, varias pantallas que
deberían sentirse "en vivo" durante el torneo (`/clasificacion`, `/admin/envios`) hacen polling
manual con `useEffect` + `setInterval`, y el panel de administración tiene huecos funcionales
reales: no se puede eliminar un participante, no existe ninguna pantalla para gestionar cuentas de
administrador (se siembran directo en la base de datos), el botón de eliminar problema no está
conectado en la UI, y no hay forma de revisar el detalle de un envío individual ni de corregir un
veredicto que el sistema calificó mal.

Este documento cubre todo eso como un solo cambio: navegación por rol, la integración canónica de
TanStack Query con TanStack Start (reemplazando el polling manual existente), y el resto de
operaciones CRUD que le faltaban al panel de administración.

## Alcance de este cambio

- **Agrega**: navbar de administrador, navbar de participante, botón de cerrar sesión,
  infraestructura de TanStack Query, eliminar participante, CRUD de administradores, conexión del
  botón de eliminar problema, vista de detalle de envío con aprobación manual/reversión de
  veredicto.
- **Reemplaza**: el polling manual (`useEffect`/`setInterval`) de `/clasificacion` y
  `/admin/envios` por `useQuery` con `refetchInterval`.
- **No cambia**: el motor de calificación (Piston, harness, veredictos), el modelo de categorías,
  el flujo de registro/check-in ya existente, el cálculo de standings (`calcularClasificacion`) —
  la aprobación manual de un envío se apoya en ese mismo cálculo sin modificarlo.
- Fuera de alcance: guardas de navegación (`beforeLoad`) para redirigir según rol/sesión — hoy no
  existen y este cambio no las agrega; la autorización real sigue siendo la que ya hacen los
  `createServerFn` vía `requerirAdmin`/`requerirParticipanteIngresado`. Los navbars ocultan enlaces
  que fallarían, pero no son un mecanismo de seguridad.

## Infraestructura de TanStack Query

Se agrega `@tanstack/react-query` como dependencia (ya está `@tanstack/react-router-ssr-query`,
el paquete de integración, pero sin el core no sirve de nada). Se engancha en el punto canónico
para TanStack Start, la función `getRouter()` de `src/router.tsx`:

```ts
const queryClient = new QueryClient()
const router = createTanStackRouter({ routeTree, context: { queryClient }, ... })
setupRouterSsrQueryIntegration({ router, queryClient })
```

Esto deshidrata en el HTML del SSR cualquier dato pedido en un loader vía
`queryClient.ensureQueryData(...)` y lo rehidrata en el cliente sin duplicar el fetch.
`__root.tsx` pasa a usar `createRootRouteWithContext<{ queryClient: QueryClient }>()` y envuelve
`RootDocument` en `<QueryClientProvider client={queryClient}>`.

Cada dato "en vivo" se modela como un archivo de `queryOptions` reutilizable entre el loader (SSR)
y el `useQuery` del componente (cliente), en `src/server/queries/`:

- `clasificacionQueryOptions()` — envuelve `obtenerClasificacion`.
- `enviosQueryOptions()` — envuelve `listarTodosLosEnvios`.
- `participantesQueryOptions()` — envuelve `obtenerParticipantes` (compartida entre
  `/admin/participantes` y `/admin/ingreso`).
- `administradoresQueryOptions()` — envuelve `obtenerAdministradores`.
- `usuarioActualOpcionalQueryOptions()` — envuelve `obtenerUsuarioActualOpcional` (para el navbar
  de participante).

Todas las queries "en vivo" usan `refetchInterval: 3000`, el mismo intervalo que ya usaba el
polling manual de `/clasificacion`, para que el sistema se sienta consistente.

Las mutaciones (`registrarParticipante`, `registrarIngresoPorToken`, `eliminarParticipante`,
`registrarAdministrador`, `eliminarAdministrador`, `eliminarProblema`, aprobar/revertir un envío)
pasan a ser `useMutation`, y en su `onSuccess` invalidan la query correspondiente
(`queryClient.invalidateQueries`) — el dispositivo que hizo el cambio lo ve al instante, y el
resto de dispositivos lo recogen en el siguiente ciclo de `refetchInterval`.

## Capa de datos: nuevos server functions

- `src/server/functions/participantes.ts` → `obtenerParticipantes` (GET, `requerirAdmin`): todos
  los `usuarios` con `rol='participante'` (`id, nombre, correo, categoria, carnet, ingresadoEn`).
  Alimenta tanto la lista de registro como la de check-in.
- `src/server/functions/participantes.ts` → `eliminarParticipante` (POST, `requerirAdmin`): borra
  el usuario si no tiene filas en `envios` (ver "Eliminar participante" abajo); si tiene, lanza un
  error explicativo.
- `src/server/functions/administradores.ts` (nuevo) → `obtenerAdministradores`,
  `registrarAdministrador`, `eliminarAdministrador`: mismo patrón que participantes, generalizando
  `crearCuentaParticipante` para aceptar `rol`.
- `src/server/functions/auth.ts` → `obtenerUsuarioActualOpcional` (GET, sin `requerirUsuario`):
  reusa `obtenerUsuarioSesion` (que ya devuelve `null` en vez de lanzar) para no romper
  `/clasificacion`, que es pública, cuando nadie ha iniciado sesión.
- `src/server/functions/admin-submissions.ts` → `obtenerDetalleEnvio` (GET, `requerirAdmin`),
  `aprobarEnvioManualmente` / `revertirAprobacionEnvio` (POST, `requerirAdmin`).

## Cambios de esquema (`envios`)

- `resultados` (json, nullable): el arreglo completo por caso (argumentos, esperado, obtenido,
  error, tiempo excedido) que `submit.ts` ya calcula en cada envío pero hoy descarta — solo
  persiste el veredicto final (`estado`). Sin este campo, un admin no tiene forma de revisar _por
  qué_ el sistema marcó algo como incorrecto, y el override sería una decisión a ciegas.
- `veredictoOriginal` (mismo enum que `estado`, nullable): se llena solo la primera vez que se
  aprueba manualmente un envío, para poder revertir después.
- `aprobadoPorId` (varchar, referencia a `usuarios.id`, nullable) y `aprobadoEn` (timestamp,
  nullable): quién y cuándo hizo la aprobación manual, para trazabilidad si un participante
  reclama.

`submit.ts` se modifica para persistir `resultados` junto con `estado` en el mismo
`db.update(envios)` que ya hace tras calificar.

## Navegación (navbars) y logout

- **`NavbarAdmin`**, montado en un layout route nuevo `src/routes/admin/route.tsx` (TanStack
  Router envuelve automáticamente todas las rutas hijas de `admin/` cuando existe un archivo con
  el mismo nombre que el directorio). Enlaces: Participantes, Administradores, Ingreso, Torneo,
  Problemas, Envíos, Clasificación. Muestra el nombre del admin logueado y un botón "Cerrar
  sesión".
- **`NavbarParticipante`**: requiere mover `perfil.tsx`, `problemas/` y `clasificacion.tsx` a un
  grupo pathless nuevo `src/routes/_app/` (el prefijo `_app` no agrega segmento a la URL — las
  rutas siguen siendo `/perfil`, `/problemas`, `/clasificacion`). El layout
  `src/routes/_app/route.tsx` usa `usuarioActualOpcionalQueryOptions()` para no exigir sesión —
  `/clasificacion` debe seguir siendo visible sin login (p. ej. una pantalla pública del evento).
  Reglas de visibilidad:
  - Sin sesión: solo la marca del sistema (útil para ver `/clasificacion` en una pantalla
    pública), sin "Perfil" ni "Cerrar sesión".
  - Con sesión, sin check-in (`ingresadoEn` nulo): solo "Perfil" (ahí está el QR) y "Cerrar
    sesión". "Problemas" y "Clasificación" se ocultan deliberadamente hasta el check-in, aunque
    `/clasificacion` en sí no lo exige a nivel de servidor — es una decisión de UX para no mostrar
    algo irrelevante antes de que la persona haya sido admitida al evento.
  - Con sesión y check-in hecho: los tres enlaces (Perfil, Problemas, Clasificación) más "Cerrar
    sesión".
  - Esta query usa `refetchInterval: 3000`, así que en cuanto un admin escanea el QR de alguien,
    su navbar cambia solo, sin que la persona recargue la página.
- **Logout**: `authClient.signOut()` (better-auth, mismo cliente que ya usa `index.tsx`) seguido
  de `navigate({ to: '/' })`, en un hook compartido `useCerrarSesion()` usado por ambos navbars.

## Gestión de participantes y administradores

- **Eliminar participante**: bloqueado si el participante ya tiene filas en `envios` — proteger la
  integridad del leaderboard pesa más que poder "deshacer" un registro después de que alguien ya
  compitió. El borrado en cascada de `sesiones`/`cuentas`/`corridas` ya está cubierto por
  `onDelete: 'cascade'` en el esquema; `preguntasIa` (que no tiene cascade) se borra a mano dentro
  de la misma transacción. El botón "Eliminar" en `/admin/participantes` aparece deshabilitado con
  un tooltip explicando el motivo cuando el participante ya tiene envíos.
- **Administradores** (`/admin/administradores`, pantalla nueva): listar (reusa el patrón de
  `obtenerParticipantes` filtrando `rol='admin'`), crear (mismo flujo que registrar participantes:
  contraseña aleatoria + correo de bienvenida por Brevo, con el mismo fallback de mostrarla en
  pantalla si Brevo falla; `categoria` se fija a `'senior'` como placeholder sin significado real,
  igual que en el resto del sistema), eliminar (sin restricción adicional — un admin no tiene
  `envios` que perder).

## Problemas y envíos (admin)

- Se conecta el botón "Eliminar problema" en `/admin/problemas/$problemaId` al `eliminarProblema`
  que ya existe en el servidor pero no tenía ningún disparador en la UI, con una confirmación
  (borra en cascada `problemaLenguajes` y `casosPrueba`).
- Nueva vista de detalle `/admin/envios/$envioId`: código completo enviado, el `resultados`
  persistido por caso (argumentos/esperado/obtenido/error), el comentario de Claude si aplica, y
  quién aprobó manualmente el envío (si aplica).
- Botón "Aprobar manualmente" (visible solo si `estado !== 'aceptado'`): guarda
  `veredictoOriginal = estado actual`, cambia `estado = 'aceptado'`, y setea `aprobadoPorId` /
  `aprobadoEn`. Como `calcularClasificacion` ya selecciona el primer envío con
  `estado === 'aceptado'` ordenado por `creadoEn`, este cambio se refleja en el leaderboard sin
  ninguna lógica especial adicional — el envío aprobado compite por su marca de tiempo original,
  no por el momento en que el admin lo revisó.
- Botón "Revertir" (visible solo si `veredictoOriginal` no es nulo): restaura
  `estado = veredictoOriginal` y limpia `veredictoOriginal`, `aprobadoPorId`, `aprobadoEn`.

## Vistas en vivo migradas a TanStack Query

- `/clasificacion`: el loader usa `queryClient.ensureQueryData(clasificacionQueryOptions())`: el
  componente usa `useQuery(clasificacionQueryOptions())` con `refetchInterval: 3000`, en vez del
  `useEffect`/`setInterval` manual actual.
- `/admin/envios`: mismo patrón con `enviosQueryOptions()`.
- `/admin/participantes` y `/admin/ingreso`: ambas consumen `participantesQueryOptions()`
  (compartida), así que un participante recién registrado o recién escaneado en una estación
  aparece en la otra pantalla sin recargar.
- `/admin/administradores`: `administradoresQueryOptions()`.
- Navbar de participante: `usuarioActualOpcionalQueryOptions()`, como se describe arriba.

## Testing

Se mantiene el enfoque del resto del proyecto: lógica pura testeada con vitest, sin automatización
de navegador para UI (eso lo verifica el usuario manualmente). Dos piezas nuevas se extraen como
funciones puras, siguiendo el mismo patrón que `checkin/result.ts` → `construirResultadoIngreso`:

- `src/server/envios/aprobacion.ts` (`aplicarAprobacionManual` / `revertirAprobacionEnvio`) —
  transiciones de los campos de auditoría, cubierto en `tests/envios-aprobacion.test.ts`. Caso
  clave: aprobar dos veces seguidas no debe pisar `veredictoOriginal` con `'aceptado'`.
- `src/server/participantes/eliminar.ts` (`puedeEliminarParticipante`) — el predicado de bloqueo
  por cantidad de envíos, cubierto en `tests/participantes-eliminar.test.ts`.

Antes de dar por cerrada la implementación se corre `npm run test` completo para confirmar que
nada de lo existente (harness, judge, standings, hint cadence) se rompió, ya que `submit.ts`
cambia (persiste `resultados`) y `standings/calculate.ts` sigue sin tocarse pero ahora puede
recibir envíos marcados `aceptado` por override manual.

## Riesgos / consideraciones abiertas

- Persistir `resultados` completo (incluyendo salida esperada de casos ocultos) en `envios` es un
  cambio de retención de datos: antes esa información se descartaba tras responder al participante
  (`ocultarDetalleCasosNoVisibles` solo se aplicaba a la respuesta HTTP, no a lo persistido). Ahora
  queda en la base de datos indefinidamente, visible para cualquier admin. Para el tamaño de este
  torneo no es un problema, pero vale tenerlo presente si el dataset creciera mucho.
- El navbar oculta enlaces según estado, pero no reemplaza la autorización real del servidor — si
  alguien fuerza la navegación a una ruta que no le corresponde, el `createServerFn` subyacente
  sigue rechazándola igual que hoy. No se agregan guardas de `beforeLoad` en este cambio.
- Mover `perfil.tsx`, `problemas/` y `clasificacion.tsx` a `src/routes/_app/` es un refactor de
  ubicación de archivos sin cambiar URLs ni lógica interna — bajo riesgo, pero conviene revisar que
  `routeTree.gen.ts` se regenere correctamente (`npm run generate-routes`) tras el movimiento.
