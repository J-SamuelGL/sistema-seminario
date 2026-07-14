# Torneo de programación — Motor de calificación basado en funciones multi-lenguaje

## Contexto y objetivo

El diseño original (`2026-07-13-torneo-programacion-design.md`) definió el juez como comparación
exacta de stdout contra un `expected_output`, sin detallar el mecanismo. La implementación
resultante (`src/server/judge/runTestCases.ts`, `src/server/piston/client.ts`) es un juez puro de
**stdin → programa completo → stdout**: el código que escribe el participante se manda tal cual a
Piston, el `entrada` de cada caso se pasa por stdin, y se compara el stdout capturado contra
`salidaEsperada` con igualdad de texto exacta. No hay invocación de función ni casos ocultos (el
spec original dice explícitamente que todos los casos son visibles).

Los ejercicios que se están redactando para el torneo (ver ejemplos aprobados de la categoría
Invitados/Junior) están escritos en formato "función con firma + tabla de ejemplos" al estilo
LeetCode, no en formato stdin/stdout, y varios son ejercicios de debugging donde se espera poder
resolver el mismo problema en distintos lenguajes (Python, JavaScript, Java, C#, PHP) cambiando
libremente entre ellos. El juez actual no puede calificar ese formato: un envío que solo define la
función sin leerla de stdin ni imprimir el resultado produce stdout vacío y reprueba siempre, sin
importar si la lógica es correcta.

Además, durante el diseño se identificaron dos riesgos de integridad de la calificación:

- **Hardcodeo de un valor fijo** (ej. `return 2` sin usar el argumento): mitigado con casos de
  prueba variados, ya cubierto por el juez actual y por este rediseño.
- **Enumeración de casos visibles** (ej. `if numeros == [1,2,2,3,2]: return 3 elif ...`): no
  mitigado hoy, porque no existen casos ocultos. Se vuelve más fácil de explotar con argumentos
  estructurados (comparar una lista literal es trivial).

Este documento describe el rediseño del motor de calificación para resolver ambos problemas.

## Alcance de este cambio

- **Reemplaza por completo**: el modelo de juez stdin/stdout, por un modelo de invocación de
  función tipada (firma + argumentos + valor de retorno), en los 5 lenguajes soportados.
- **Agrega**: casos de prueba ocultos (obligatorio al menos uno por problema), modelo de
  puntuación por suma de puntos en el leaderboard, hardening de límites de recursos en Piston.
- **No cambia**: check-in QR, categorías/registro manual (`2026-07-14-categorias-registro-manual-design.md`),
  asistente de Haiku para Invitados, despliegue en Railway (salvo instalación de runtimes nuevos).
- **Fuera de alcance**: casos ocultos autogenerados a partir de una solución de referencia con
  inputs aleatorios (se evaluó y se decidió que el costo de ingeniería no se justifica todavía
  frente a la Opción de casos ocultos manuales); prueba de carga de Piston para ~40 participantes
  concurrentes, incluyendo lenguajes compilados (queda como verificación operativa antes del
  evento, no como trabajo de este spec); revisión manual de las soluciones top del leaderboard
  antes de premiar (práctica operativa recomendada, no requiere cambios de código).
- **No hay datos que migrar**: todavía no hay problemas reales cargados en el sistema con el
  modelo viejo.

## Modelo de datos

**`problemas`** — se elimina `lenguajesPermitidos`. Se agrega:

- `parametros` (JSON): `{ nombre: string, tipo: TipoDato }[]`, en el orden en que se le pasan a la
  función.
- `tipoRetorno` (`TipoDato`).
- `puntos` (int): puntos que otorga resolver el problema (ver "Modelo de puntuación").

`TipoDato = 'int' | 'float' | 'bool' | 'string' | 'list<int>' | 'list<float>' | 'list<bool>' | 'list<string>'`.
No se soportan diccionarios/objetos ni listas anidadas — ningún ejercicio propuesto hasta ahora
los necesita.

**`problema_lenguajes`** (tabla nueva):

- `id`, `problemaId` (FK a `problemas`, cascade delete)
- `lenguaje` (enum: `python` | `javascript` | `java` | `csharp` | `php`)
- `nombreFuncion` (text) — el nombre de la función en la convención de ese lenguaje (ej.
  `contar_vocales` en Python/PHP, `contarVocales` en JS/Java, `ContarVocales` en C#).
- `codigoInicial` (text) — starter code que ve el participante al elegir ese lenguaje. Para
  problemas de debugging, contiene el bug ya escrito en la sintaxis de ese lenguaje.
- Único por (`problemaId`, `lenguaje`). Los lenguajes permitidos de un problema son los que tengan
  fila aquí — se elimina cualquier noción separada de "lenguajes permitidos".
- El nombre de función y el starter code se escriben a mano por el administrador para cada
  lenguaje que se quiera habilitar en un problema — no se auto-detectan ni se traducen
  automáticamente entre lenguajes, porque un mismo bug conceptual no siempre se traduce igual
  (ej. `if n = objetivo` es error de sintaxis en Python pero código válido en PHP).

**`casos_prueba`** — `entrada`/`salidaEsperada` (texto libre) se reemplazan por:

- `argumentos` (JSON): valores tipados, uno por parámetro, en el mismo orden que `parametros`.
- `salidaEsperada` (JSON): valor tipado, del tipo `tipoRetorno`.
- `visible` (boolean): si aparece en la tabla de ejemplos del enunciado y en el detalle de
  resultados de "Run".

## Generación del driver por lenguaje

Ubicación propuesta: `src/server/judge/harness/{python,javascript,java,csharp,php}.ts`.

Por cada caso de prueba, el sistema genera el código fuente completo a mandar a Piston: el código
que escribió el participante, más un driver generado por el servidor que:

1. Llama a la función (usando el `nombreFuncion` de ese lenguaje) con los argumentos del caso,
   **embebidos como literales nativos del lenguaje** (ej. `[1, 2, 2, 3, 2]` en Python/JS/PHP,
   `Arrays.asList(1, 2, 2, 3, 2)` en Java, `new List<int>{1,2,2,3,2}` en C#) — no se parsean desde
   JSON en tiempo de ejecución, porque el servidor ya conoce los valores al generar el código y
   así se evita depender de librerías de parseo JSON que puedan no estar disponibles en el
   runtime de Piston.
2. Imprime el resultado en un **formato canónico construido por el propio driver** (no por el
   `print`/`toString`/`echo` nativo del lenguaje), para que la comparación de texto sea
   independiente del lenguaje elegido. Esto es necesario porque la serialización nativa varía
   entre lenguajes de forma incompatible — el caso más concreto detectado: `bool` se imprime como
   `True`/`False` en Python, `true`/`false` en JS/Java, `True`/`False` en C#, y con `echo` nativo
   en PHP un booleano se convierte a `"1"` (true) o cadena vacía (false). El driver de cada
   lenguaje debe construir el texto de salida con su propia lógica (ej. siempre `"true"`/`"false"`
   en minúscula), no delegarlo a la conversión nativa.
3. Java y C# se envuelven en la clase que Piston espera como punto de entrada (`Main`), ya que el
   participante en esos lenguajes solo escribe el método/función, no una clase completa.
4. Ya no se usa `stdin` para nada — se elimina el parámetro `entradaEstandar` de `ejecutarPiston`.

Para poder comparar, el servidor necesita su propia función canonicalizadora (TypeScript, en
`src/server/judge/`) que convierta el valor `salidaEsperada` guardado (JSON tipado) al mismo
formato de texto que produce cada driver. Esta lógica de formato (cómo se imprime un `bool`, cómo
se delimitan los elementos de una lista, etc.) debe mantenerse idéntica entre las 5 plantillas de
driver y esta función del servidor — es una sola definición de formato canónico que se implementa
6 veces (5 lenguajes + servidor), no 6 formatos independientes.

## Flujo de Run y Submit

Tanto `ejecutarCodigo` (Run) como `enviarCodigo` (Submit) corren **siempre contra todos los casos
de prueba de un problema, visibles y ocultos** — mismo veredicto en ambos, para que nunca haya una
discrepancia entre lo que ve el participante en "Run" y lo que recibe en "Submit".

La diferencia entre Run y Submit es únicamente de qué tanto detalle se muestra:

- Casos con `visible = true`: se muestra el detalle completo (argumentos, salida esperada, salida
  obtenida, si pasó o no).
- Casos con `visible = false`: solo se muestra si el conjunto de casos ocultos pasó o no en
  conjunto (ej. "1 caso oculto: ✅" o "❌"), sin revelar argumentos ni salida esperada. Esto
  preserva la protección contra enumeración de casos (el participante no puede memorizar inputs
  que nunca ve) sin sacrificar la consistencia entre Run y Submit.

`determinarVeredicto` no cambia su lógica de agregación (algún timeout → `tiempo_excedido`; algún
código de salida distinto de 0 → `error_ejecucion`; todos aprobados → `aceptado`; si no,
`respuesta_incorrecta`), pero se le agrega un guard defensivo explícito para el caso de 0
resultados (hoy `[].every(...)` es `true` por vacuidad en JavaScript, lo que da `aceptado`
automático a cualquier código si un problema llegara a quedar sin casos de prueba). Con la
validación de guardado descrita abajo este caso ya no debería ser alcanzable, pero el guard se
agrega de todas formas como defensa en profundidad.

## Validación al guardar un problema (`validarDatosProblema`)

- Cada `argumentos`/`salidaEsperada` de cada caso debe coincidir en cantidad y tipo con
  `parametros`/`tipoRetorno` del problema.
- Mínimo 4 casos de prueba.
- No todas las `salidaEsperada` pueden ser iguales entre sí (evita cargar por accidente un
  problema donde un bug o un hardcodeo pasarían desapercibidos por falta de variedad — ver
  ejemplo de "Contar vocales" en la sección de casos ocultos).
- Al menos un caso debe tener `visible = true` (para poder mostrar ejemplos en el enunciado).
- **Al menos un caso debe tener `visible = false`** — regla dura, no solo recomendación. Sin esto,
  ningún problema tendría protección contra enumeración de casos, que fue el motivo principal de
  este rediseño.
- Cada lenguaje presente en `problema_lenguajes` debe tener `nombreFuncion` y `codigoInicial` no
  vacíos.

## Hardening de `ejecutarPiston`

Hoy solo se manda `run_timeout: 5000`. Se agrega:

- `compile_timeout`: necesario porque Java y C# ahora introducen un paso de compilación que hoy
  no existe para Python/JS/PHP, y no está acotado por `run_timeout`.
- `run_memory_limit` y `compile_memory_limit`: se fijan explícitamente en la petición en vez de
  depender del default del servidor Piston desplegado, que no está documentado. Se debe verificar
  con una prueba real (código que reserve memoria agresivamente) que el límite efectivamente se
  aplica.

## Modelo de puntuación (leaderboard)

Reemplaza el modelo ICPC puro del spec original (conteo de problemas resueltos + tiempo +
penalización) por ranking basado en puntos:

- `problemas.puntos` ya definido arriba.
- `calcularClasificacion` (`src/server/standings/calculate.ts`) recibe además los puntos de cada
  problema, y calcula `puntosTotales` por usuario sumando los puntos de los problemas con al menos
  un envío `aceptado`.
- Orden del leaderboard: `puntosTotales` descendente; `minutosPenalizacionTotal` ascendente como
  desempate. La fórmula de penalización no cambia (minutos desde el inicio del torneo + 20 minutos
  por cada intento fallido previo al aceptado, por problema resuelto).
- `cantidadResueltos` se conserva en `FilaClasificacion` como dato informativo (se puede seguir
  mostrando en la tabla), pero deja de ser el criterio de orden.
- `LeaderboardTable` y `leaderboard.ts` se ajustan para reflejar puntos como columna principal.

## Componentes de UI afectados

- `AdminProblemForm`: parámetros tipados (nombre + tipo), puntos, y por cada caso de prueba:
  argumentos (uno por parámetro), salida esperada, y el checkbox `visible`. Por cada lenguaje:
  nombre de función y código inicial.
- `CodeEditor`: al cambiar de lenguaje, reinicia el contenido al `codigoInicial` de ese lenguaje
  para ese problema (no se mantiene un buffer por lenguaje).
- `ProblemDescription`: la tabla de "Ejemplos" se genera automáticamente a partir de los casos con
  `visible = true` — ya no se redacta a mano en el markdown de la descripción.
- `RunResults` / `SubmitResult`: nuevo formato de detalle (argumentos/esperado/obtenido) para
  casos visibles, más el resumen agregado de casos ocultos descrito arriba.

## Testing

- `tests/judge.test.ts`: casos nuevos para la generación de drivers por lenguaje (al menos un caso
  representativo por lenguaje y por tipo de dato, incluyendo `bool` dado el riesgo de
  serialización nativa distinto por lenguaje) y para la comparación canónica de salida.
- `tests/piston-client.test.ts`: cubrir los nuevos parámetros (`compile_timeout`,
  `run_memory_limit`, `compile_memory_limit`) en la petición a Piston.
- `tests/standings.test.ts`: casos para el nuevo orden por `puntosTotales` con desempate por
  tiempo.
- Caso de regresión explícito para el guard de `determinarVeredicto` con 0 resultados.

## Instalación de runtimes en Piston

`scripts/install-piston-languages.sh` instala hoy solo `python` y `javascript`. Se debe extender
para instalar también `java`, `csharp` y `php`. Las versiones exactas de cada paquete se deben
confirmar contra el catálogo de paquetes del servidor Piston desplegado (`GET /api/v2/runtimes`)
al momento de instalar, no se fijan de antemano en este spec.
