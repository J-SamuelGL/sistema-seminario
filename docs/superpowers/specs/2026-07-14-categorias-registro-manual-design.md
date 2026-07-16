# Torneo de programación — Categorías, registro manual y autenticación

## Contexto y objetivo

El diseño original (`2026-07-13-torneo-programacion-design.md`) asumía un evento de un solo
salón (20-40 personas) con 2 categorías (`senior`/`junior`) autoseleccionadas al hacer login con
Google/GitHub OAuth. El alcance del torneo creció: ahora pueden participar todos los estudiantes
de la universidad (de cualquier carrera) y estudiantes de bachillerato, con 3 categorías en vez
de 2. Como la universidad no emite carné físico ni un documento que muestre el semestre actual
del estudiante, no hay forma confiable de verificar la categoría de alguien de manera puramente
online sin arriesgar que alguien se inscriba en una categoría que no le corresponde. Se decidió
resolver esto con un registro 100% manual y presencial, controlado por los administradores, para
no comprometer la integridad de las categorías ni la experiencia de los participantes con pasos
de verificación online (subir documentos, esperar aprobación, etc.).

Este documento describe los cambios de diseño necesarios sobre el documento original. Todo lo que
no se menciona aquí (mecánica de Piston, panel de administración de problemas, cálculo de
standings estilo ICPC, despliegue en Railway) se mantiene igual.

## Alcance de este cambio

- **Reemplaza**: el modelo de 2 categorías autoseleccionadas vía OAuth, por 3 categorías
  asignadas por un administrador durante un registro presencial.
- **Elimina**: login por Google/GitHub OAuth, la pantalla de autoselección de categoría
  (`/registro`), y la creación de cuentas por el propio participante.
- **No cambia**: mecánica de "Run"/"Submit" vía Piston (salvo la adición descrita más abajo),
  check-in QR del día del evento, CRUD de problemas en el panel de admin, cálculo de standings,
  despliegue en Railway.
- Fuera de alcance: verificación automática/documental de categoría (se descartó a favor del
  registro manual), recuperación de contraseña autoservicio (ver sección de autenticación).

## Categorías y elegibilidad

- **Invitados**: estudiantes de bachillerato + estudiantes universitarios de cualquier carrera
  que no sea ingeniería en sistemas.
- **Junior**: estudiantes de ingeniería en sistemas en 4to semestre o menos.
- **Senior**: estudiantes de ingeniería en sistemas en más de 4to semestre.
- Invitados y Junior resuelven el mismo set de ejercicios; Senior tiene su propio set.
- Solo Invitados tiene acceso al asistente conversacional de Haiku (hasta 3 preguntas durante
  todo el torneo) y es la única categoría que recibe feedback/hints generados por Haiku. Junior y
  Senior nunca ven contenido generado por IA — solo el veredicto o la salida cruda de Piston.
- Leaderboard: 3 tablas separadas (Invitados, Junior, Senior), cada una con su propio
  primer/segundo/tercer lugar. Aunque Invitados y Junior compartan ejercicios, no compiten entre
  sí porque Invitados tiene ventaja de asistencia por IA.

## Registro manual (proceso)

- Días antes del torneo, los encargados recorren los salones (secciones de ingeniería en
  sistemas por semestre, salones de bachillerato, salones de otras carreras) con una pantalla
  nueva del sistema (`/admin/participantes`) abierta en un dispositivo.
- **Categoría por sesión**: al entrar a un salón, el encargado fija la categoría una vez
  (Invitados/Junior/Senior) para ese lote; cada persona que registre ahí queda con esa categoría
  por defecto, sin tener que reelegirla por persona.
- **Datos capturados por persona**: nombre completo, correo electrónico (obligatorio, se usa
  como usuario de login), y carné (solo si es universitario — bachillerato no lo tiene).
- No existe ninguna vía de autoregistro. Un participante nunca puede crear su propia cuenta ni
  elegir su categoría.

## Autenticación

- Se elimina el login por OAuth (Google/GitHub). Better Auth se reconfigura para usar el
  proveedor de email + contraseña en vez de proveedores OAuth.
- No hay `signUp` público. La única forma de crear una cuenta es una función de servidor
  exclusiva de administradores, invocada desde `/admin/participantes`.
- Al registrar a cada persona, el sistema:
  1. Crea la cuenta (rol `participante`) con el correo capturado como usuario y una contraseña
     aleatoria segura generada por el servidor.
  2. Genera su `tokenIngreso`/QR, igual que en el diseño original (se usa en el check-in del día
     del evento).
  3. Envía un correo de bienvenida vía **Brevo** (API gratuita, sin problemas de bloqueo de
     puertos SMTP en Railway) con el usuario (su correo) y la contraseña generada.
- **Recuperación de acceso**: si alguien pierde su contraseña, el administrador puede volver a
  `/admin/participantes`, buscar su registro, y reenviar el correo de bienvenida regenerando la
  contraseña — mismo mecanismo que el registro inicial. No hay flujo de recuperación autoservicio
  (innecesario para un evento de una sola sesión).
- El check-in físico del día del evento (escaneo de QR en `/admin/ingreso`) no cambia: solo tras
  el check-in el participante puede acceder a `/problemas`.

## Ejecución de código y feedback por categoría

- **Run** (probar sin enviar formalmente): las 3 categorías ven la salida cruda de Piston por
  caso (stdout/stderr) al instante. No crea un `envio`.
  - **Invitados**: además, cada 3 corridas (contador por problema, se reinicia al cambiar de
    problema) se agrega un hint de Haiku a la salida. Corridas 1 y 2 → solo salida cruda; corrida
    3, 6, 9... → salida cruda + hint. Cadencia fija (no aleatoria) para tener un tope duro y
    predecible de llamadas a la API de Claude.
  - **Junior y Senior**: solo salida cruda de Piston, nunca hints, en ninguna corrida.
- **Submit** (envío formal, cuenta para el leaderboard): las 3 categorías reciben el veredicto
  (aceptado/fallido) de inmediato.
  - **Invitados**: además recibe feedback de Haiku (explicación del error, o comentario de estilo
    si fue aceptado) — una vez por envío, sin relación con el contador de "Run".
  - **Junior y Senior**: solo el veredicto, sin ningún comentario generado por IA.
- El límite de "3 preguntas al asistente" (botón conversacional aparte) es independiente de estos
  hints automáticos de Run/Submit — su propio contador de 3 preguntas totales durante el torneo,
  solo para Invitados.

## Modelo de datos (cambios sobre el esquema actual)

- **`usuarios.categoria`**: el enum se amplía de `['senior', 'junior']` a
  `['invitado', 'junior', 'senior']`, y pasa a ser **NOT NULL** — la categoría siempre se define
  en el momento en que el admin crea la cuenta, ya no hay autoselección posterior.
- **`usuarios.carnet`**: campo nuevo, texto nullable. Solo se llena para universitarios
  (bachillerato queda `null`). Sirve como respaldo/auditoría de que se verificó a esa persona en
  persona.
- **`usuarios.preguntasIaUsadas`**: mismo campo existente, pero el límite pasa de 2 a 3, y la
  lógica en `src/server/assistant/limit.ts` pasa de chequear `categoria === 'junior'` a
  `categoria === 'invitado'`.
- **Tabla nueva `corridas`**: `usuarioId`, `problemaId`, `contador` (int, default 0) — único por
  par usuario+problema. Se incrementa en cada "Run"; cuando `contador % 3 === 0` se agrega el
  hint de Haiku (solo si `categoria === 'invitado'`).
- **`problemas.grupo`**: campo nuevo, enum `['invitado_junior', 'senior']` — separa qué ejercicios
  ve cada categoría (Invitados y Junior comparten `'invitado_junior'`; Senior solo ve `'senior'`).
- **Eliminar**: la ruta `/registro` (autoselección), y las funciones `establecerCategoria` /
  `asegurarCategoriaNoDefinida` en `src/server/auth/category.ts` — ya no aplican.
- **Better Auth**: se reconfigura de proveedores OAuth (Google/GitHub) a proveedor de email +
  contraseña. El `cuentas` (tabla `account` de Better Auth) sigue existiendo sin cambios de
  esquema — Better Auth guarda ahí el hash de la contraseña bajo un proveedor `credential` en vez
  de tokens OAuth.

## Panel de administración (cambios)

- **Nueva pantalla `/admin/participantes`**: fija la categoría de la sesión/salón, permite
  agregar personas una por una (nombre, correo, carné opcional), y dispara la creación de cuenta
  - envío de correo por cada una.
- El resto del panel de administración (CRUD de problemas, iniciar torneo, check-in QR, vista en
  vivo de envíos) no cambia.

## Envío de correo (Brevo)

- Integración server-side vía la API de Brevo (variable de entorno para la API key).
- Se invoca una sola vez por registro exitoso, con la plantilla de bienvenida (usuario +
  contraseña generada). El reenvío (recuperación de acceso) reutiliza la misma plantilla.

## Riesgos / consideraciones abiertas

- Carga operativa de recorrer todos los salones (bachillerato + todas las carreras + secciones de
  ingeniería en sistemas por semestre) — se acepta este costo deliberadamente para no
  comprometer la integridad de las categorías ni la experiencia de los participantes con procesos
  de verificación online.
- Si Brevo falla al enviar un correo, el registro en el sistema ya quedó creado (el participante
  existe con su categoría correcta) pero sin credenciales entregadas — el admin necesita un
  mecanismo para detectar envíos fallidos y reintentar (a definir en el plan de implementación).

## Testing

- Se mantiene el enfoque del diseño original: pruebas automatizadas para la lógica pura
  (standings, ahora también el contador de `corridas` y la cadencia de hints), y verificación
  manual para los flujos que dependen de servicios externos (envío real de correo vía Brevo,
  escaneo de QR, ejecución vía Piston).
- Caso de prueba clave: un usuario `invitado` en la corrida 3 de un problema recibe hint; en las
  corridas 1, 2, 4 y 5 no; en la 6 sí de nuevo. Un usuario `junior` o `senior` nunca recibe hint
  sin importar el número de corrida.
