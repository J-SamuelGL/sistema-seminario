# Torneo de programación tipo LeetCode — Diseño

## Contexto y objetivo

Un salón de clase quiere organizar un torneo de programación competitiva, inspirado en la interfaz de LeetCode: panel de descripción del problema a la izquierda, editor de código a la derecha. Es un evento **presencial, de una sola sesión**, con un leaderboard en vivo proyectado en pantalla. Se construye con **TanStack Start** y se despliega en **Railway**.

## Alcance

- Evento único, presencial, en un salón de clase.
- 20-40 participantes aproximadamente.
- Dos categorías de competencia: `senior` y `junior` (el participante elige la suya al registrarse). La categoría `junior` tiene acceso a un asistente de IA limitado (ver sección "Asistente de IA para categoría Junior"); `senior` no.
- Lenguajes soportados: Python, JavaScript, y potencialmente otros que soporte el motor de ejecución (a definir la lista exacta al cargar los problemas).
- Fuera de alcance: múltiples torneos/histórico de eventos, detección de plagio, modo espectador aparte del leaderboard, más de un torneo corriendo simultáneamente.

## Arquitectura

Un solo proyecto de Railway con tres servicios:

```
┌─────────────────────────────────────────────┐
│  Railway Project                             │
│                                               │
│  ┌───────────────────┐   ┌────────────────┐ │
│  │ TanStack Start app │──▶│ Piston service │ │
│  │ (frontend + server │   │ (Docker image  │ │
│  │  functions/API)    │   │  oficial,      │ │
│  │                     │   │  red privada)  │ │
│  └─────────┬──────────┘   └────────────────┘ │
│            │                                  │
│            ▼                                  │
│  ┌───────────────────┐                        │
│  │ Postgres            │                       │
│  │ (managed by Railway)│                       │
│  └───────────────────┘                        │
└─────────────────────────────────────────────┘
            │
            ▼
    Claude API (Anthropic) — llamada server-side,
    solo para feedback cualitativo post-veredicto
```

- **TanStack Start**: app única (frontend + server functions). No hace falta un backend separado.
- **Piston**: motor de ejecución de código open source (usado por Replit), auto-hospedado como servicio Docker separado dentro del mismo proyecto de Railway. Se accede solo por red privada interna — nunca se expone a internet directamente.
- **Postgres**: fuente única de verdad, administrado por Railway.
- **Claude API**: se invoca desde el servidor únicamente, después de que Piston ya determinó el veredicto de la submission. Nunca decide correctness — solo genera feedback cualitativo.

### Por qué este enfoque y no otros

Se descartaron: (a) usar WebSockets/SSE para el leaderboard — complejidad de infraestructura innecesaria para 20-40 personas en un mismo salón, donde polling cada 3-4s es indistinguible de tiempo real; (b) separar frontend/backend en servicios independientes — sobre-ingeniería para un evento de una sola sesión; (c) Judge0 en vez de Piston — más robusto pero requiere Docker-in-Docker/isolate, mucho más pesado de desplegar y mantener que Piston para este caso de uso; (d) dejar que Claude decida correctness directamente — puede alucinar, es más lento y más caro que comparar output real vs esperado.

## Modelo de datos

- **`users`**: id, nombre, email, avatar (de OAuth), rol (`participant` | `admin`), `category` (`senior` | `junior`, elegida al registrarse), `checkin_token` (único, generado al crear la cuenta), `checked_in_at` (nullable — null hasta que el organizador escanea su QR), `ai_questions_used` (0-2, solo relevante para `junior`).
- **`problems`**: id, título, descripción (markdown), dificultad, lenguajes permitidos, orden/puntos.
- **`test_cases`**: id, problem_id, input, expected_output. Todos son visibles para el participante (no hay casos ocultos).
- **`submissions`**: id, user_id, problem_id, código, lenguaje, timestamp, status (`pending`|`accepted`|`wrong_answer`|`runtime_error`|`timeout`), tiempo de ejecución, feedback de Claude (texto, nullable hasta que se genera).
- **`ai_questions`**: id, user_id, problem_id (nullable, en qué problema estaba cuando preguntó), pregunta, respuesta, timestamp. Log de las preguntas al asistente de Haiku (solo aplica a `junior`).
- **Standings**: vista/cálculo derivado de `submissions`, no es una tabla propia — problemas resueltos (count) + tiempo total desde el inicio del torneo + penalización de +20 minutos por cada intento fallido previo al intento correcto, por problema (regla estándar de ICPC). Si un problema nunca se resuelve, no penaliza (solo cuentan los intentos previos al `accepted`). El ranking se calcula por separado dentro de cada categoría (`senior` y `junior` no compiten entre sí).
- **Estado global del torneo**: un registro simple (ej. tabla `tournament_state` de una sola fila) con el timestamp de inicio, usado para calcular tiempos en el leaderboard.

## Flujos principales

### Pre-evento: registro y check-in

1. El participante crea su cuenta con Google o GitHub OAuth desde su casa, antes del evento. Queda creada pero no "presente".
2. Al crear la cuenta se genera un token único y su perfil muestra un QR personal (codifica ese token, no datos sensibles como el email).
3. El día del evento, cada participante muestra su QR desde su celular.
4. El organizador abre la página de "Check-in" en el panel de admin, que activa la cámara del dispositivo. Escanea cada QR; el servidor decodifica el token, busca la cuenta, y marca `checked_in_at = now()`.
5. Solo las cuentas con `checked_in_at` no nulo pueden acceder a las rutas de torneo (`/problems/*`). El resto ve una pantalla de "esperando check-in".

Esto evita que alguien se registre y resuelva los problemas remotamente sin supervisión — la cuenta existe, pero no puede participar hasta que el organizador la marca como presente en persona.

### Durante el torneo: navegación entre problemas

- Todos los problemas están disponibles desde el inicio del torneo, sin bloqueo secuencial ni prerequisitos.
- El participante puede navegar libremente entre problemas en cualquier orden, en cualquier momento — puede intentar el problema 1, pasar al 2 si se atora, y regresar al 1 después. No hay restricciones de flujo.

### "Run" (probar código sin enviar)

1. El participante escribe su código en el editor (Monaco) y elige el lenguaje.
2. Click en "Run" → server function manda el código + los casos de prueba del problema a Piston.
3. Piston ejecuta cada caso y devuelve stdout/stderr por caso.
4. La UI muestra el resultado por caso (✅/❌) al instante. Esto no crea una `submission`, es solo para iterar.

### "Submit" (marcar como terminado)

1. Click en "Submit" → se crea una `submission` (status `pending`).
2. Se ejecuta el código contra todos los casos de prueba vía Piston.
3. Comparación exacta output-esperado-vs-real determina el veredicto de forma inmediata y determinística.
4. En paralelo, sin bloquear la respuesta al usuario, se llama a Claude (modelo Haiku 4.5) con el enunciado, el código, el veredicto, y el stderr/output si hubo falla — para generar feedback breve (explicación del error, o comentario de estilo/eficiencia si fue aceptado). El feedback se guarda en la submission y aparece en la UI unos segundos después de mostrado el veredicto.
5. Si `accepted`, se recalculan los standings del usuario (problemas resueltos, tiempo, +20 min de penalización por cada intento fallido previo en ese mismo problema).

### Leaderboard

- Página `/leaderboard` (para proyectar en pantalla) hace polling cada 3-4 segundos a una server function que calcula standings desde `submissions`.
- Orden: número de problemas resueltos (desc), luego tiempo total con penalización (asc) — estilo ICPC.
- Se muestran **dos tablas separadas**, una para `senior` y otra para `junior` — cada categoría tiene su propio primer, segundo y tercer lugar. No compiten entre sí, ya que junior tiene acceso al asistente de IA y senior no.

## Asistente de IA para categoría Junior

- Motivado por la temática del seminario (Agentic Coding): un apoyo puntual de IA para quienes están aprendiendo, sin resolverles el problema.
- Visible únicamente para participantes con `category = junior`. Los `senior` no ven esta opción.
- **UI**: botón "Preguntar a Haiku" junto al editor de código, que abre un modal con un campo de texto libre y un contador ("Preguntas restantes: 2/2"). Cada pregunta enviada y su respuesta se muestran como un mini-chat de máximo 2 turnos dentro del mismo modal.
- **Límite**: 2 preguntas en total durante todo el torneo (no por problema), llevado en `users.ai_questions_used`. Al llegar a 2, el input queda deshabilitado con un tooltip explicando que ya agotó sus preguntas.
- **Modelo**: Claude Haiku 4.5 (rápido y barato, apropiado para respuestas cortas de sintaxis).
- **Restricción de contenido**: la llamada a Haiku incluye el enunciado del problema actual como contexto, junto con instrucciones estrictas de responder únicamente preguntas generales de sintaxis o uso de funciones/estructuras estándar del lenguaje (ej. "¿cómo uso `.filter` en JS?", "¿cómo declaro un array en Java?"). Si la pregunta pide o insinúa la lógica/solución del problema actual, Haiku debe rechazar amablemente y sugerir reformular hacia algo más general. Esto es un control por prompt (buena fe), no una garantía absoluta contra manipulación deliberada del prompt — aceptable para el contexto de un evento de salón de clase.
- Cada pregunta y respuesta se guarda en `ai_questions` para poder revisar después qué se preguntó durante el evento.

## Autenticación y roles

- Login con Google o GitHub OAuth (librería recomendada: Better Auth, con soporte nativo para TanStack Start y ambos providers).
- Primer login crea el usuario con rol `participant`.
- El organizador se marca manualmente como `admin` en la base de datos.
- Cualquier persona con cuenta Google/GitHub puede registrarse como participante; el control real de acceso al torneo lo da el check-in físico (QR), no el registro de cuenta.

## Panel de administración

- CRUD de problemas: título, descripción (markdown), dificultad, lenguajes permitidos, casos de prueba (input/output).
- Botón "iniciar torneo" que fija el timestamp de inicio usado para el leaderboard.
- Página de check-in con escáner de QR (cámara del dispositivo).
- Vista en vivo de todas las submissions (para detectar problemas con Piston durante el evento).

## Despliegue en Railway

- **Servicio 1**: app TanStack Start, deploy directo desde GitHub.
- **Servicio 2**: Piston (`ghcr.io/engineer-man/piston`), con paso de inicialización para instalar los lenguajes necesarios (Python, Node, etc.) vía su gestor de paquetes. Accesible solo por red privada interna de Railway — no expuesto a internet.
- **Servicio 3**: Postgres (plugin nativo de Railway).
- Variables de entorno: `ANTHROPIC_API_KEY`, `DATABASE_URL` (inyectada automáticamente por Railway), credenciales OAuth de Google/GitHub, `PISTON_URL` (dominio interno de Railway).
- Migraciones de esquema con Drizzle ORM.

## Testing

- Foco en pruebas de la lógica de standings (cálculo de ranking con penalización por intentos) — es la pieza de lógica pura más propensa a errores sutiles.
- Pruebas de integración manuales para: flujo OAuth, escaneo de QR/check-in, ejecución vía Piston (Run y Submit), CRUD de problemas en el panel de admin, límite de 2 preguntas del asistente de IA (que se bloquee correctamente al llegar a 0), y verificación manual de que el asistente rechaza preguntas que piden la solución directa del problema.
- Dado el timeline corto de un evento único, no se justifica una suite E2E exhaustiva; se prioriza verificar manualmente el camino feliz y los casos de error de Piston (timeout, runtime error) antes del evento.
