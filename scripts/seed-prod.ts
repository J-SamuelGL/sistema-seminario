import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { db } from '../src/server/db/client'
import {
  usuarios,
  cuentas,
  problemas,
  problemaLenguajes,
  casosPrueba,
} from '../src/server/db/schema'
import type { Parametro, TipoDato, Valor } from '../src/server/judge/tipos'

// Seed para producción: no trunca ninguna tabla. Solo crea el admin y los
// problemas si todavía no existen (seguro de correr más de una vez).

async function crearAdmin(input: {
  nombre: string
  correo: string
  contrasena: string
}) {
  const existente = await db.query.usuarios.findFirst({
    where: eq(usuarios.email, input.correo),
  })
  if (existente) {
    console.log(`Admin ya existe (${input.correo}), se omite.`)
    return existente.id
  }

  const id = crypto.randomUUID()
  const hash = await hashPassword(input.contrasena)
  await db.insert(usuarios).values({
    id,
    name: input.nombre,
    email: input.correo,
    rol: 'admin',
    categoria: 'senior', // placeholder sin significado real para admins
    carnet: null,
    ingresadoEn: new Date(),
  })
  await db.insert(cuentas).values({
    id: crypto.randomUUID(),
    userId: id,
    accountId: id,
    providerId: 'credential',
    password: hash,
  })
  console.log(`Admin creado: ${input.correo}`)
  return id
}

type LenguajeSeed = {
  lenguaje: 'python' | 'javascript' | 'java' | 'csharp' | 'php'
  nombreFuncion: string
  codigoInicial: string
}
type CasoSeed = { argumentos: Valor[]; salidaEsperada: Valor; visible: boolean }

async function crearProblemaSeed(input: {
  titulo: string
  descripcion: string
  dificultad: 'Fácil' | 'Intermedio' | 'Difícil'
  categoriaProblema: 'debugging' | 'normal'
  orden: number
  grupo: 'invitado_junior' | 'senior'
  puntos: number
  parametros: Parametro[]
  tipoRetorno: TipoDato
  lenguajes: LenguajeSeed[]
  casosPrueba: CasoSeed[]
}) {
  const existente = await db.query.problemas.findFirst({
    where: eq(problemas.titulo, input.titulo),
  })
  if (existente) {
    console.log(`Problema ya existe ("${input.titulo}"), se omite.`)
    return existente.id
  }

  const id = crypto.randomUUID()
  await db.insert(problemas).values({
    id,
    titulo: input.titulo,
    descripcion: input.descripcion,
    dificultad: input.dificultad,
    categoriaProblema: input.categoriaProblema,
    orden: input.orden,
    grupo: input.grupo,
    puntos: input.puntos,
    parametros: input.parametros,
    tipoRetorno: input.tipoRetorno,
  })
  await db.insert(problemaLenguajes).values(
    input.lenguajes.map((l) => ({
      problemaId: id,
      lenguaje: l.lenguaje,
      nombreFuncion: l.nombreFuncion,
      codigoInicial: l.codigoInicial,
    })),
  )
  await db.insert(casosPrueba).values(
    input.casosPrueba.map((c) => ({
      problemaId: id,
      argumentos: c.argumentos,
      salidaEsperada: c.salidaEsperada,
      visible: c.visible,
    })),
  )
  console.log(`Problema creado: "${input.titulo}"`)
  return id
}

async function main() {
  await crearAdmin({
    nombre: 'Admin',
    correo: 'samuel89067@gmail.com',
    contrasena: 'test123',
  })

  await crearProblemaSeed({
    titulo: 'Suma de dos números',
    descripcion:
      'Escribe una función que reciba dos números enteros a y b, y devuelva su suma.',
    dificultad: 'Fácil',
    categoriaProblema: 'normal',
    orden: 1,
    grupo: 'invitado_junior',
    puntos: 10,
    parametros: [
      { nombre: 'a', tipo: 'int' },
      { nombre: 'b', tipo: 'int' },
    ],
    tipoRetorno: 'int',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'suma_dos_numeros',
        codigoInicial:
          'def suma_dos_numeros(a, b):\n    # Escribe tu solución aquí\n    return 0\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'sumaDosNumeros',
        codigoInicial:
          'function sumaDosNumeros(a, b) {\n  // Escribe tu solución aquí\n  return 0;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'sumaDosNumeros',
        codigoInicial:
          '  public static int sumaDosNumeros(int a, int b) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'SumaDosNumeros',
        codigoInicial:
          '  static int SumaDosNumeros(int a, int b) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'sumaDosNumeros',
        codigoInicial:
          'function sumaDosNumeros($a, $b) {\n    // Escribe tu solución aquí\n    return 0;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [2, 3], salidaEsperada: 5, visible: true },
      { argumentos: [10, 15], salidaEsperada: 25, visible: true },
      { argumentos: [-5, 5], salidaEsperada: 0, visible: false },
      { argumentos: [100, 200], salidaEsperada: 300, visible: false },
      { argumentos: [7, -2], salidaEsperada: 5, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Es número primo',
    descripcion:
      'Escribe una función que reciba un número entero n y devuelva true si n es primo, false en caso contrario.',
    dificultad: 'Intermedio',
    categoriaProblema: 'normal',
    orden: 2,
    grupo: 'invitado_junior',
    puntos: 15,
    parametros: [{ nombre: 'n', tipo: 'int' }],
    tipoRetorno: 'bool',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'es_primo',
        codigoInicial:
          'def es_primo(n):\n    # Escribe tu solución aquí\n    return False\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'esPrimo',
        codigoInicial:
          'function esPrimo(n) {\n  // Escribe tu solución aquí\n  return false;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'esPrimo',
        codigoInicial:
          '  public static boolean esPrimo(int n) {\n    // Escribe tu solución aquí\n    return false;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'EsPrimo',
        codigoInicial:
          '  static bool EsPrimo(int n) {\n    // Escribe tu solución aquí\n    return false;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'esPrimo',
        codigoInicial:
          'function esPrimo($n) {\n    // Escribe tu solución aquí\n    return false;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [7], salidaEsperada: true, visible: true },
      { argumentos: [8], salidaEsperada: false, visible: true },
      { argumentos: [2], salidaEsperada: true, visible: false },
      { argumentos: [1], salidaEsperada: false, visible: false },
      { argumentos: [97], salidaEsperada: true, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Máximo de una lista',
    descripcion:
      'Escribe una función que reciba una lista de números enteros y devuelva el valor máximo.',
    dificultad: 'Intermedio',
    categoriaProblema: 'normal',
    orden: 3,
    grupo: 'invitado_junior',
    puntos: 20,
    parametros: [{ nombre: 'numeros', tipo: 'list<int>' }],
    tipoRetorno: 'int',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'maximo_lista',
        codigoInicial:
          'def maximo_lista(numeros):\n    # Escribe tu solución aquí\n    return 0\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'maximoLista',
        codigoInicial:
          'function maximoLista(numeros) {\n  // Escribe tu solución aquí\n  return 0;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'maximoLista',
        codigoInicial:
          '  public static int maximoLista(List<Integer> numeros) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'MaximoLista',
        codigoInicial:
          '  static int MaximoLista(List<int> numeros) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'maximoLista',
        codigoInicial:
          'function maximoLista($numeros) {\n    // Escribe tu solución aquí\n    return 0;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [[1, 5, 3]], salidaEsperada: 5, visible: true },
      { argumentos: [[-1, -5, -3]], salidaEsperada: -1, visible: true },
      { argumentos: [[10]], salidaEsperada: 10, visible: false },
      { argumentos: [[2, 2, 2]], salidaEsperada: 2, visible: false },
      { argumentos: [[100, 50, 99, 1]], salidaEsperada: 100, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Contar vocales (con error)',
    descripcion:
      'Se les da una función que debería contar cuántas vocales tiene un texto, pero tiene un error de ' +
      'depuración. Deben encontrarlo y corregirlo: compara la letra contra toda la cadena "aeiou" con ' +
      'igualdad exacta, en vez de verificar si la letra está contenida en esa cadena.',
    dificultad: 'Fácil',
    categoriaProblema: 'debugging',
    orden: 4,
    grupo: 'invitado_junior',
    puntos: 10,
    parametros: [{ nombre: 'texto', tipo: 'string' }],
    tipoRetorno: 'int',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'contar_vocales',
        codigoInicial:
          "def contar_vocales(texto):\n    contador = 0\n    vocales = \"aeiou\"\n    for letra in texto:\n        if letra == vocales:   # bug: debería ser 'in', no '=='\n            contador += 1\n    return contador\n",
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'contarVocales',
        codigoInicial:
          'function contarVocales(texto) {\n  let contador = 0;\n  const vocales = "aeiou";\n  for (const letra of texto) {\n    if (letra === vocales) {   // bug: debería ser vocales.includes(letra)\n      contador++;\n    }\n  }\n  return contador;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'contarVocales',
        codigoInicial:
          '  public static int contarVocales(String texto) {\n    int contador = 0;\n    String vocales = "aeiou";\n    for (char letra : texto.toCharArray()) {\n      if (String.valueOf(letra).equals(vocales)) {   // bug: debería usar vocales.contains(...)\n        contador++;\n      }\n    }\n    return contador;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'ContarVocales',
        codigoInicial:
          '  static int ContarVocales(string texto) {\n    int contador = 0;\n    string vocales = "aeiou";\n    foreach (char letra in texto) {\n      if (letra.ToString() == vocales) {   // bug: debería usar vocales.Contains(letra)\n        contador++;\n      }\n    }\n    return contador;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'contarVocales',
        codigoInicial:
          'function contarVocales($texto) {\n    $contador = 0;\n    $vocales = "aeiou";\n    for ($i = 0; $i < strlen($texto); $i++) {\n        $letra = $texto[$i];\n        if ($letra == $vocales) {   // bug: debería usar strpos($vocales, $letra)\n            $contador++;\n        }\n    }\n    return $contador;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: ['hola'], salidaEsperada: 2, visible: true },
      { argumentos: ['mazatenango'], salidaEsperada: 5, visible: true },
      { argumentos: ['xyz'], salidaEsperada: 0, visible: false },
      { argumentos: ['programacion'], salidaEsperada: 5, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Sumar los dígitos de un número',
    descripcion:
      'Escribe una función que reciba un número entero positivo y devuelva la suma de sus dígitos.',
    dificultad: 'Intermedio',
    categoriaProblema: 'normal',
    orden: 5,
    grupo: 'invitado_junior',
    puntos: 20,
    parametros: [{ nombre: 'n', tipo: 'int' }],
    tipoRetorno: 'int',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'sumar_digitos',
        codigoInicial:
          'def sumar_digitos(n):\n    # Escribe tu solución aquí\n    return 0\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'sumarDigitos',
        codigoInicial:
          'function sumarDigitos(n) {\n  // Escribe tu solución aquí\n  return 0;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'sumarDigitos',
        codigoInicial:
          '  public static int sumarDigitos(int n) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'SumarDigitos',
        codigoInicial:
          '  static int SumarDigitos(int n) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'sumarDigitos',
        codigoInicial:
          'function sumarDigitos($n) {\n    // Escribe tu solución aquí\n    return 0;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [123], salidaEsperada: 6, visible: true },
      { argumentos: [9], salidaEsperada: 9, visible: true },
      { argumentos: [1000], salidaEsperada: 1, visible: false },
      { argumentos: [4567], salidaEsperada: 22, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Contar mayúsculas en un texto',
    descripcion:
      'Escribe una función que reciba un texto y devuelva cuántas letras mayúsculas tiene.',
    dificultad: 'Fácil',
    categoriaProblema: 'normal',
    orden: 6,
    grupo: 'invitado_junior',
    puntos: 10,
    parametros: [{ nombre: 'texto', tipo: 'string' }],
    tipoRetorno: 'int',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'contar_mayusculas',
        codigoInicial:
          'def contar_mayusculas(texto):\n    # Escribe tu solución aquí\n    return 0\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'contarMayusculas',
        codigoInicial:
          'function contarMayusculas(texto) {\n  // Escribe tu solución aquí\n  return 0;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'contarMayusculas',
        codigoInicial:
          '  public static int contarMayusculas(String texto) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'ContarMayusculas',
        codigoInicial:
          '  static int ContarMayusculas(string texto) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'contarMayusculas',
        codigoInicial:
          'function contarMayusculas($texto) {\n    // Escribe tu solución aquí\n    return 0;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: ['Hola Mundo'], salidaEsperada: 2, visible: true },
      { argumentos: ['mazatenango'], salidaEsperada: 0, visible: true },
      { argumentos: ['GUATEMALA'], salidaEsperada: 9, visible: false },
      { argumentos: ['SueA'], salidaEsperada: 2, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Duplicar cada número de una lista',
    descripcion:
      'Escribe una función que reciba una lista de números y devuelva una nueva lista donde cada número ' +
      'está multiplicado por 2.',
    dificultad: 'Fácil',
    categoriaProblema: 'normal',
    orden: 7,
    grupo: 'invitado_junior',
    puntos: 10,
    parametros: [{ nombre: 'numeros', tipo: 'list<int>' }],
    tipoRetorno: 'list<int>',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'duplicar_numeros',
        codigoInicial:
          'def duplicar_numeros(numeros):\n    # Escribe tu solución aquí\n    return []\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'duplicarNumeros',
        codigoInicial:
          'function duplicarNumeros(numeros) {\n  // Escribe tu solución aquí\n  return [];\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'duplicarNumeros',
        codigoInicial:
          '  public static List<Integer> duplicarNumeros(List<Integer> numeros) {\n    // Escribe tu solución aquí\n    return new ArrayList<>();\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'DuplicarNumeros',
        codigoInicial:
          '  static List<int> DuplicarNumeros(List<int> numeros) {\n    // Escribe tu solución aquí\n    return new List<int>();\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'duplicarNumeros',
        codigoInicial:
          'function duplicarNumeros($numeros) {\n    // Escribe tu solución aquí\n    return [];\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [[1, 2, 3]], salidaEsperada: [2, 4, 6], visible: true },
      { argumentos: [[5, 0, -2]], salidaEsperada: [10, 0, -4], visible: true },
      { argumentos: [[]], salidaEsperada: [], visible: false },
      { argumentos: [[10]], salidaEsperada: [20], visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Encontrar el mayor número de una lista (con error)',
    descripcion:
      'Se les da una función que debería encontrar el número más grande de una lista, pero tiene un error: ' +
      'inicializa el mayor en 0, lo cual falla si todos los números de la lista son negativos (nunca entra ' +
      'a la condición, y devuelve 0 incorrectamente). Deben corregir la inicialización.',
    dificultad: 'Intermedio',
    categoriaProblema: 'debugging',
    orden: 8,
    grupo: 'invitado_junior',
    puntos: 20,
    parametros: [{ nombre: 'numeros', tipo: 'list<int>' }],
    tipoRetorno: 'int',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'encontrar_mayor',
        codigoInicial:
          'def encontrar_mayor(numeros):\n    mayor = 0   # bug: falla si todos los números son negativos\n    for n in numeros:\n        if n > mayor:\n            mayor = n\n    return mayor\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'encontrarMayor',
        codigoInicial:
          'function encontrarMayor(numeros) {\n  let mayor = 0;   // bug: falla si todos los números son negativos\n  for (const n of numeros) {\n    if (n > mayor) {\n      mayor = n;\n    }\n  }\n  return mayor;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'encontrarMayor',
        codigoInicial:
          '  public static int encontrarMayor(List<Integer> numeros) {\n    int mayor = 0;   // bug: falla si todos los números son negativos\n    for (int n : numeros) {\n      if (n > mayor) {\n        mayor = n;\n      }\n    }\n    return mayor;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'EncontrarMayor',
        codigoInicial:
          '  static int EncontrarMayor(List<int> numeros) {\n    int mayor = 0;   // bug: falla si todos los números son negativos\n    foreach (int n in numeros) {\n      if (n > mayor) {\n        mayor = n;\n      }\n    }\n    return mayor;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'encontrarMayor',
        codigoInicial:
          'function encontrarMayor($numeros) {\n    $mayor = 0;   // bug: falla si todos los números son negativos\n    foreach ($numeros as $n) {\n        if ($n > $mayor) {\n            $mayor = $n;\n        }\n    }\n    return $mayor;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [[3, 7, 2, 9, 4]], salidaEsperada: 9, visible: true },
      { argumentos: [[-5, -2, -8]], salidaEsperada: -2, visible: true },
      { argumentos: [[1]], salidaEsperada: 1, visible: false },
      { argumentos: [[10, 10, 5]], salidaEsperada: 10, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Verificar si un texto es palíndromo (con error)',
    descripcion:
      'Se les da una función que debería verificar si un texto se lee igual al derecho y al revés, pero ' +
      'tiene un error: no normaliza el texto (no quita espacios ni ignora mayúsculas/minúsculas) antes de ' +
      'comparar, por lo que falla con frases como "Anita lava la tina" que sí son palíndromos si se ignoran ' +
      'espacios y capitalización.',
    dificultad: 'Difícil',
    categoriaProblema: 'debugging',
    orden: 9,
    grupo: 'invitado_junior',
    puntos: 30,
    parametros: [{ nombre: 'texto', tipo: 'string' }],
    tipoRetorno: 'bool',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'es_palindromo',
        codigoInicial:
          'def es_palindromo(texto):\n    invertido = texto[::-1]\n    if texto == invertido:\n        return True\n    return False\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'esPalindromo',
        codigoInicial:
          'function esPalindromo(texto) {\n  const invertido = texto.split("").reverse().join("");\n  if (texto === invertido) {\n    return true;\n  }\n  return false;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'esPalindromo',
        codigoInicial:
          '  public static boolean esPalindromo(String texto) {\n    String invertido = new StringBuilder(texto).reverse().toString();\n    if (texto.equals(invertido)) {\n      return true;\n    }\n    return false;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'EsPalindromo',
        codigoInicial:
          '  static bool EsPalindromo(string texto) {\n    char[] arreglo = texto.ToCharArray();\n    Array.Reverse(arreglo);\n    string invertido = new string(arreglo);\n    if (texto == invertido) {\n      return true;\n    }\n    return false;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'esPalindromo',
        codigoInicial:
          'function esPalindromo($texto) {\n    $invertido = strrev($texto);\n    if ($texto === $invertido) {\n        return true;\n    }\n    return false;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: ['reconocer'], salidaEsperada: true, visible: true },
      { argumentos: ['hola'], salidaEsperada: false, visible: true },
      {
        argumentos: ['Anita lava la tina'],
        salidaEsperada: true,
        visible: false,
      },
      { argumentos: ['A'], salidaEsperada: true, visible: false },
    ],
  })

  console.log('\nListo.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
