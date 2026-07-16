# Salida de consola del usuario en "Ejecutar" (Run)

## Problema

El programa generado para cada caso de prueba llama a la función del participante y luego imprime el
resultado canónico en la misma salida estándar (`stdout`) que Piston captura. Hoy, `ejecutarCasosPrueba`
trata **todo** el `stdout` como el resultado a comparar. Si el código del participante hace `print` /
`console.log` / equivalentes (por ejemplo, para depurar), esa salida se mezcla con la línea del juez y
rompe la comparación — una solución correcta puede marcarse como `respuesta_incorrecta` solo por tener un
`print` de depuración.

## Objetivo

1. Permitir que el código del participante imprima libremente sin romper la calificación.
2. Mostrar esos prints en una sección de consola separada, por caso, únicamente en el flujo de "Ejecutar"
   (botón Run), igual que el panel de stdout de LeetCode.

## No objetivos

- No se modifica el flujo de "Enviar" (Submit): `SubmitResult.tsx` nunca mostró detalle de casos y no lo
  hará ahora tampoco.
- No se muestra la consola de casos ocultos (mismo criterio que ya existe para argumentos/salida
  esperada/obtenida: los casos ocultos solo exponen `visible: false` y `aprobado`).
- No se cambia la detección de errores de compilación/ejecución (`salidaError`, `codigoSalida`,
  `tiempoExcedido`), que sigue viniendo de `stderr` / metadata de Piston sin tocar.

## Mecanismo: marcador delimitador

Cada generador de harness (`python.ts`, `javascript.ts`, `java.ts`, `csharp.ts`, `php.ts`) antepone un
marcador constante, único en todo el codebase, a su línea final de impresión del resultado. Por ejemplo en
Python:

```python
print('##RESULTADO_JUEZ##' + str(__resultado_juez__))
```

El marcador se define una sola vez en un módulo nuevo, `src/server/judge/harness/marcador.ts`
(`MARCADOR_RESULTADO_JUEZ = '##RESULTADO_JUEZ##'`), e importa tanto en cada generador como en el parser, para
que nunca puedan desincronizarse.

Se descartaron dos alternativas:

- **Redirección de stdout por lenguaje** (capturar el stdout del usuario en un buffer separado durante la
  llamada a la función, ej. `sys.stdout` en Python, `System.setOut` en Java, `ob_start()` en PHP): más
  "correcto" en teoría, pero exige una implementación distinta por cada uno de los 5 lenguajes para un
  beneficio marginal frente al marcador.
- **Usar `stderr` para el resultado del juez**: se descarta porque `stderr` ya se usa para errores reales de
  ejecución/compilación; mezclar el resultado canónico ahí rompería la detección de errores.

## Flujo de datos

1. `src/server/judge/consola.ts` (nuevo) exporta `separarSalidaConsola(salidaCruda: string): { salidaConsola:
string; salidaResultado: string }`. Busca la última ocurrencia del marcador en `salidaCruda`:
   - Si aparece: todo lo anterior (trimmed) es `salidaConsola`; todo lo posterior (trimmed) es
     `salidaResultado`.
   - Si no aparece (la ejecución truena o hace timeout antes de llegar a esa línea): todo el `stdout`
     (trimmed) se trata como `salidaConsola` y `salidaResultado` queda `''`. Esto reutiliza el
     comportamiento de falla que ya existe hoy para esos casos (comparación contra `''` nunca aprueba).
2. `runTestCases.ts` llama a `separarSalidaConsola` sobre `salida.salidaEstandar` en vez de usar
   `salida.salidaEstandar.trim()` directamente como `salidaObtenida`. `salidaResultado` reemplaza al actual
   `salidaObtenida` para efectos de comparación (esto además corrige el bug descrito arriba); `salidaConsola`
   se agrega como campo nuevo en cada `ResultadoCaso`.
3. `ResultadoCaso` (`src/server/judge/verdict.ts`) gana el campo `salidaConsola: string`.
4. `ocultarDetalleCasosNoVisibles` (`src/server/judge/resultadoPublico.ts`): el campo `salidaConsola` se
   incluye solo en la rama `visible: true` de `ResultadoCasoPublico`. La rama `visible: false` no cambia.
5. `RunResults.tsx`: debajo de cada caso visible, si `salidaConsola` no está vacío, se renderiza un bloque
   `<pre>` con encabezado "Consola" mostrando el texto tal cual (preservando saltos de línea). Si está vacío,
   no se renderiza nada (igual que el panel de stdout de LeetCode cuando no hay output).
6. `SubmitResult.tsx` no se toca.

## Manejo de errores

- **Timeout**: el marcador probablemente nunca se imprime → toda la salida parcial ya emitida por el usuario
  antes del kill se muestra como consola. Útil para depurar loops infinitos.
- **Excepción/crash en el código del usuario**: mismo caso — lo emitido antes del crash se muestra como
  consola; `salidaResultado` vacío, la comparación falla como ya ocurre hoy.
- Nada cambia en `salidaError` / `codigoSalida` / `tiempoExcedido`, que vienen de Piston sin pasar por este
  parseo.

## Testing

- Prueba unitaria nueva para `separarSalidaConsola`: con marcador y consola no vacía, con marcador y consola
  vacía, sin marcador (timeout/crash).
- Actualizar los 5 `tests/harness-*.test.ts` para verificar que la línea de impresión final incluye el
  marcador (`MARCADOR_RESULTADO_JUEZ`).
- Actualizar `tests/judge.test.ts`: los mocks de `ejecutarPiston` deben devolver `salidaEstandar` con el
  marcador incluido (reflejando la salida real de un harness), y agregar un caso donde el mock incluye texto
  de "consola" antes del marcador, verificando que `resultados[i].salidaConsola` lo captura y que la
  comparación del resultado sigue funcionando igual.
- Los tests de integración reales contra Piston (los que ejecutan Piston de verdad) deben seguir pasando sin
  cambios de comportamiento salvo el nuevo campo `salidaConsola`.
