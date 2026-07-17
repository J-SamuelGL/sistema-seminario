import 'dotenv/config'
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
import type { Semestre } from '../src/server/participantes/validar'

const TABLAS_A_LIMPIAR = [
  'preguntas_ia',
  'corridas',
  'envios',
  'casos_prueba',
  'problema_lenguajes',
  'sesion',
  'cuenta',
  'verificacion',
  'problemas',
  'usuario',
] as const

async function limpiarBaseDeDatos() {
  await db.execute('SET FOREIGN_KEY_CHECKS = 0')
  for (const tabla of TABLAS_A_LIMPIAR) {
    await db.execute(`TRUNCATE TABLE \`${tabla}\``)
  }
  await db.execute('SET FOREIGN_KEY_CHECKS = 1')
  console.log('Base de datos limpiada.')
}

async function crearCuenta(input: {
  nombre: string
  correo: string
  contrasena: string
  rol: 'participante' | 'admin'
  categoria: 'invitado' | 'junior' | 'senior'
  carnet: string | null
  semestre?: Semestre | null
  ingresado: boolean
}) {
  const id = crypto.randomUUID()
  const hash = await hashPassword(input.contrasena)
  await db.insert(usuarios).values({
    id,
    name: input.nombre,
    email: input.correo,
    rol: input.rol,
    categoria: input.categoria,
    carnet: input.carnet,
    semestre: input.semestre ?? null,
    ingresadoEn: input.ingresado ? new Date() : null,
  })
  await db.insert(cuentas).values({
    id: crypto.randomUUID(),
    userId: id,
    accountId: id,
    providerId: 'credential',
    password: hash,
  })
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
  return id
}

async function main() {
  await limpiarBaseDeDatos()

  const adminContrasena = 'AdminPrueba123!'
  const adminId = await crearCuenta({
    nombre: 'Admin de Prueba',
    correo: 'admin@torneo.local',
    contrasena: adminContrasena,
    rol: 'admin',
    categoria: 'senior',
    carnet: null,
    ingresado: true,
  })

  const participanteContrasena = 'ParticipantePrueba123!'
  const participanteId = await crearCuenta({
    nombre: 'Participante de Prueba',
    correo: 'participante@torneo.local',
    contrasena: participanteContrasena,
    rol: 'participante',
    categoria: 'invitado',
    carnet: '99-9999-2026',
    ingresado: true,
  })

  const CONTRASENA_MASIVA = 'test123'

  for (let i = 1; i <= 5; i++) {
    await crearCuenta({
      nombre: `Admin ${i}`,
      correo: `admin${i}@torneo.local`,
      contrasena: CONTRASENA_MASIVA,
      rol: 'admin',
      categoria: 'senior', // placeholder sin significado real para admins
      carnet: null,
      ingresado: true,
    })
  }

  function categoriaParticipanteMasivo(
    i: number,
  ): 'invitado' | 'junior' | 'senior' {
    if (i <= 13) return 'invitado'
    if (i <= 26) return 'junior'
    return 'senior'
  }

  function semestreParticipanteMasivo(i: number): Semestre | null {
    if (i <= 13) return null // invitado: no aplica
    if (i <= 26) return String(((i - 14) % 4) + 1) as Semestre // junior: 4to semestre o menos
    return String(5 + ((i - 27) % 6)) as Semestre // senior: más de 4to semestre
  }

  for (let i = 1; i <= 40; i++) {
    await crearCuenta({
      nombre: `Usuario ${i}`,
      correo: `usuario${i}@torneo.local`,
      contrasena: CONTRASENA_MASIVA,
      rol: 'participante',
      categoria: categoriaParticipanteMasivo(i),
      carnet: `carnet-${String(i).padStart(2, '0')}-2026`,
      semestre: semestreParticipanteMasivo(i),
      ingresado: true,
    })
  }

  await crearProblemaSeed({
    titulo: 'Contar vocales (con error)',
    descripcion:
      'Se les da una función que debería contar cuántas vocales tiene un texto, pero tiene un error de depuración: compara la letra contra toda la cadena "aeiou" con igualdad exacta, en vez de verificar si la letra está contenida en esa cadena. Deben encontrar el error y corregirlo.',
    dificultad: 'Intermedio',
    categoriaProblema: 'debugging',
    orden: 1,
    grupo: 'invitado_junior',
    puntos: 20,
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
    titulo: 'Contar números negativos en una lista',
    descripcion:
      'Escribe una función que reciba una lista de números y devuelva cuántos de ellos son negativos.',
    dificultad: 'Fácil',
    categoriaProblema: 'normal',
    orden: 2,
    grupo: 'invitado_junior',
    puntos: 10,
    parametros: [{ nombre: 'numeros', tipo: 'list<int>' }],
    tipoRetorno: 'int',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'contar_negativos',
        codigoInicial:
          'def contar_negativos(numeros):\n    # Escribe tu solución aquí\n    return 0\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'contarNegativos',
        codigoInicial:
          'function contarNegativos(numeros) {\n  // Escribe tu solución aquí\n  return 0;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'contarNegativos',
        codigoInicial:
          '  public static int contarNegativos(List<Integer> numeros) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'ContarNegativos',
        codigoInicial:
          '  static int ContarNegativos(List<int> numeros) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'contarNegativos',
        codigoInicial:
          'function contarNegativos($numeros) {\n    // Escribe tu solución aquí\n    return 0;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [[1, -2, 3, -4, 5]], salidaEsperada: 2, visible: true },
      { argumentos: [[-1, -2, -3]], salidaEsperada: 3, visible: true },
      { argumentos: [[1, 2, 3]], salidaEsperada: 0, visible: false },
      { argumentos: [[0, -5, 5]], salidaEsperada: 1, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Contar mayúsculas en un texto',
    descripcion:
      'Escribe una función que reciba un texto y devuelva cuántas letras mayúsculas tiene.',
    dificultad: 'Fácil',
    categoriaProblema: 'normal',
    orden: 3,
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
      'Escribe una función que reciba una lista de números y devuelva una nueva lista donde cada número está multiplicado por 2.',
    dificultad: 'Fácil',
    categoriaProblema: 'normal',
    orden: 4,
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
    titulo: 'Verificar si un elemento está en una lista (con error)',
    descripcion:
      'Se les da una función que debería verificar si un elemento está en una lista, pero tiene un error de depuración: el `else` dentro del bucle hace que la función se detenga y devuelva False en cuanto encuentra el primer elemento que no coincide con el objetivo, sin revisar el resto de la lista. Deben encontrar el error y corregirlo.',
    dificultad: 'Difícil',
    categoriaProblema: 'debugging',
    orden: 5,
    grupo: 'invitado_junior',
    puntos: 30,
    parametros: [
      { nombre: 'lista', tipo: 'list<int>' },
      { nombre: 'objetivo', tipo: 'int' },
    ],
    tipoRetorno: 'bool',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'contiene_elemento',
        codigoInicial:
          'def contiene_elemento(lista, objetivo):\n    for elemento in lista:\n        if elemento == objetivo:\n            return True\n        else:\n            return False   # bug: corta el bucle en la primera comparación\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'contieneElemento',
        codigoInicial:
          'function contieneElemento(lista, objetivo) {\n  for (const elemento of lista) {\n    if (elemento === objetivo) {\n      return true;\n    } else {\n      return false;   // bug: corta el bucle en la primera comparación\n    }\n  }\n  return false;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'contieneElemento',
        codigoInicial:
          '  public static boolean contieneElemento(List<Integer> lista, int objetivo) {\n    for (int elemento : lista) {\n      if (elemento == objetivo) {\n        return true;\n      } else {\n        return false;   // bug: corta el bucle en la primera comparación\n      }\n    }\n    return false;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'ContieneElemento',
        codigoInicial:
          '  static bool ContieneElemento(List<int> lista, int objetivo) {\n    foreach (int elemento in lista) {\n      if (elemento == objetivo) {\n        return true;\n      } else {\n        return false;   // bug: corta el bucle en la primera comparación\n      }\n    }\n    return false;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'contieneElemento',
        codigoInicial:
          'function contieneElemento($lista, $objetivo) {\n    foreach ($lista as $elemento) {\n        if ($elemento == $objetivo) {\n            return true;\n        } else {\n            return false;   // bug: corta el bucle en la primera comparación\n        }\n    }\n    return false;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [[3, 7, 2, 9], 2], salidaEsperada: true, visible: true },
      { argumentos: [[3, 7, 2, 9], 3], salidaEsperada: true, visible: true },
      { argumentos: [[3, 7, 2, 9], 5], salidaEsperada: false, visible: false },
      { argumentos: [[1], 1], salidaEsperada: true, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Sumar todos los números de una lista (con error)',
    descripcion:
      'Se les da una función que debería sumar todos los números de una lista, pero tiene un error de depuración: el acumulador `total` empieza en 1 en lugar de 0. Deben encontrar el error y corregirlo.',
    dificultad: 'Fácil',
    categoriaProblema: 'debugging',
    orden: 6,
    grupo: 'invitado_junior',
    puntos: 10,
    parametros: [{ nombre: 'numeros', tipo: 'list<int>' }],
    tipoRetorno: 'int',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'sumar_lista',
        codigoInicial:
          'def sumar_lista(numeros):\n    total = 1   # bug: debería iniciar en 0\n    for n in numeros:\n        total += n\n    return total\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'sumarLista',
        codigoInicial:
          'function sumarLista(numeros) {\n  let total = 1;   // bug: debería iniciar en 0\n  for (const n of numeros) {\n    total += n;\n  }\n  return total;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'sumarLista',
        codigoInicial:
          '  public static int sumarLista(List<Integer> numeros) {\n    int total = 1;   // bug: debería iniciar en 0\n    for (int n : numeros) {\n      total += n;\n    }\n    return total;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'SumarLista',
        codigoInicial:
          '  static int SumarLista(List<int> numeros) {\n    int total = 1;   // bug: debería iniciar en 0\n    foreach (int n in numeros) {\n      total += n;\n    }\n    return total;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'sumarLista',
        codigoInicial:
          'function sumarLista($numeros) {\n    $total = 1;   // bug: debería iniciar en 0\n    foreach ($numeros as $n) {\n        $total += $n;\n    }\n    return $total;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [[1, 2, 3]], salidaEsperada: 6, visible: true },
      { argumentos: [[5, 5]], salidaEsperada: 10, visible: true },
      { argumentos: [[0, 0, 0]], salidaEsperada: 0, visible: false },
      { argumentos: [[10]], salidaEsperada: 10, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Filtrar números mayores a un umbral',
    descripcion:
      'Escribe una función que reciba una lista de números y un umbral, y devuelva una nueva lista con solo los números mayores que el umbral.',
    dificultad: 'Intermedio',
    categoriaProblema: 'normal',
    orden: 7,
    grupo: 'invitado_junior',
    puntos: 20,
    parametros: [
      { nombre: 'numeros', tipo: 'list<int>' },
      { nombre: 'umbral', tipo: 'int' },
    ],
    tipoRetorno: 'list<int>',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'filtrar_mayores_a',
        codigoInicial:
          'def filtrar_mayores_a(numeros, umbral):\n    # Escribe tu solución aquí\n    return []\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'filtrarMayoresA',
        codigoInicial:
          'function filtrarMayoresA(numeros, umbral) {\n  // Escribe tu solución aquí\n  return [];\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'filtrarMayoresA',
        codigoInicial:
          '  public static List<Integer> filtrarMayoresA(List<Integer> numeros, int umbral) {\n    // Escribe tu solución aquí\n    return new ArrayList<>();\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'FiltrarMayoresA',
        codigoInicial:
          '  static List<int> FiltrarMayoresA(List<int> numeros, int umbral) {\n    // Escribe tu solución aquí\n    return new List<int>();\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'filtrarMayoresA',
        codigoInicial:
          'function filtrarMayoresA($numeros, $umbral) {\n    // Escribe tu solución aquí\n    return [];\n}\n',
      },
    ],
    casosPrueba: [
      {
        argumentos: [[3, 8, 1, 9, 4], 5],
        salidaEsperada: [8, 9],
        visible: true,
      },
      { argumentos: [[10, 20, 30], 100], salidaEsperada: [], visible: true },
      { argumentos: [[1, 2, 3], 0], salidaEsperada: [1, 2, 3], visible: false },
      { argumentos: [[5], 5], salidaEsperada: [], visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Contar cuántas veces aparece un elemento en una lista',
    descripcion:
      'Escribe una función que reciba una lista de números y un elemento objetivo, y devuelva cuántas veces aparece ese elemento en la lista.',
    dificultad: 'Intermedio',
    categoriaProblema: 'normal',
    orden: 8,
    grupo: 'invitado_junior',
    puntos: 20,
    parametros: [
      { nombre: 'lista', tipo: 'list<int>' },
      { nombre: 'objetivo', tipo: 'int' },
    ],
    tipoRetorno: 'int',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'contar_ocurrencias',
        codigoInicial:
          'def contar_ocurrencias(lista, objetivo):\n    # Escribe tu solución aquí\n    return 0\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'contarOcurrencias',
        codigoInicial:
          'function contarOcurrencias(lista, objetivo) {\n  // Escribe tu solución aquí\n  return 0;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'contarOcurrencias',
        codigoInicial:
          '  public static int contarOcurrencias(List<Integer> lista, int objetivo) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'ContarOcurrencias',
        codigoInicial:
          '  static int ContarOcurrencias(List<int> lista, int objetivo) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'contarOcurrencias',
        codigoInicial:
          'function contarOcurrencias($lista, $objetivo) {\n    // Escribe tu solución aquí\n    return 0;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [[1, 2, 2, 3, 2], 2], salidaEsperada: 3, visible: true },
      { argumentos: [[9, 3, 9], 9], salidaEsperada: 2, visible: true },
      { argumentos: [[1, 2, 3], 5], salidaEsperada: 0, visible: false },
      { argumentos: [[7], 7], salidaEsperada: 1, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Encontrar el mayor número de una lista (con error)',
    descripcion:
      'Se les da una función que debería encontrar el número más grande de una lista, pero tiene un error: inicializa el mayor en 0, lo cual falla si todos los números de la lista son negativos (nunca entra a la condición, y devuelve 0 incorrectamente). Deben corregir la inicialización.',
    dificultad: 'Intermedio',
    categoriaProblema: 'debugging',
    orden: 9,
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
    titulo: 'Contar números dentro de un rango',
    descripcion:
      'Escribe una función que reciba una lista de números y dos valores mínimo y máximo, y devuelva cuántos números de la lista están dentro de ese rango (incluyendo los extremos).',
    dificultad: 'Intermedio',
    categoriaProblema: 'normal',
    orden: 10,
    grupo: 'invitado_junior',
    puntos: 20,
    parametros: [
      { nombre: 'numeros', tipo: 'list<int>' },
      { nombre: 'minimo', tipo: 'int' },
      { nombre: 'maximo', tipo: 'int' },
    ],
    tipoRetorno: 'int',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'contar_en_rango',
        codigoInicial:
          'def contar_en_rango(numeros, minimo, maximo):\n    # Escribe tu solución aquí\n    return 0\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'contarEnRango',
        codigoInicial:
          'function contarEnRango(numeros, minimo, maximo) {\n  // Escribe tu solución aquí\n  return 0;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'contarEnRango',
        codigoInicial:
          '  public static int contarEnRango(List<Integer> numeros, int minimo, int maximo) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'ContarEnRango',
        codigoInicial:
          '  static int ContarEnRango(List<int> numeros, int minimo, int maximo) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'contarEnRango',
        codigoInicial:
          'function contarEnRango($numeros, $minimo, $maximo) {\n    // Escribe tu solución aquí\n    return 0;\n}\n',
      },
    ],
    casosPrueba: [
      {
        argumentos: [[1, 5, 10, 15, 20], 5, 15],
        salidaEsperada: 3,
        visible: true,
      },
      { argumentos: [[1, 2, 3], 10, 20], salidaEsperada: 0, visible: true },
      { argumentos: [[5, 5, 5], 5, 5], salidaEsperada: 3, visible: false },
      {
        argumentos: [[1, 2, 3, 4, 5], 2, 4],
        salidaEsperada: 3,
        visible: false,
      },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Contar cuántos números están por encima del promedio',
    descripcion:
      'Escribe una función que reciba una lista de números y devuelva cuántos son mayores que el promedio de toda la lista.',
    dificultad: 'Intermedio',
    categoriaProblema: 'normal',
    orden: 11,
    grupo: 'invitado_junior',
    puntos: 20,
    parametros: [{ nombre: 'numeros', tipo: 'list<int>' }],
    tipoRetorno: 'int',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'contar_mayores_que_promedio',
        codigoInicial:
          'def contar_mayores_que_promedio(numeros):\n    # Escribe tu solución aquí\n    return 0\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'contarMayoresQuePromedio',
        codigoInicial:
          'function contarMayoresQuePromedio(numeros) {\n  // Escribe tu solución aquí\n  return 0;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'contarMayoresQuePromedio',
        codigoInicial:
          '  public static int contarMayoresQuePromedio(List<Integer> numeros) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'ContarMayoresQuePromedio',
        codigoInicial:
          '  static int ContarMayoresQuePromedio(List<int> numeros) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'contarMayoresQuePromedio',
        codigoInicial:
          'function contarMayoresQuePromedio($numeros) {\n    // Escribe tu solución aquí\n    return 0;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [[1, 2, 3, 4, 5]], salidaEsperada: 2, visible: true },
      { argumentos: [[10, 10, 10]], salidaEsperada: 0, visible: true },
      { argumentos: [[1, 100]], salidaEsperada: 1, visible: false },
      { argumentos: [[5]], salidaEsperada: 0, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Encontrar la posición de un elemento en una lista',
    descripcion:
      'Escribe una función que reciba una lista y un valor objetivo, y devuelva el índice de la primera aparición de ese valor en la lista, o -1 si no está.',
    dificultad: 'Fácil',
    categoriaProblema: 'normal',
    orden: 12,
    grupo: 'invitado_junior',
    puntos: 10,
    parametros: [
      { nombre: 'lista', tipo: 'list<int>' },
      { nombre: 'objetivo', tipo: 'int' },
    ],
    tipoRetorno: 'int',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'encontrar_indice',
        codigoInicial:
          'def encontrar_indice(lista, objetivo):\n    # Escribe tu solución aquí\n    return -1\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'encontrarIndice',
        codigoInicial:
          'function encontrarIndice(lista, objetivo) {\n  // Escribe tu solución aquí\n  return -1;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'encontrarIndice',
        codigoInicial:
          '  public static int encontrarIndice(List<Integer> lista, int objetivo) {\n    // Escribe tu solución aquí\n    return -1;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'EncontrarIndice',
        codigoInicial:
          '  static int EncontrarIndice(List<int> lista, int objetivo) {\n    // Escribe tu solución aquí\n    return -1;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'encontrarIndice',
        codigoInicial:
          'function encontrarIndice($lista, $objetivo) {\n    // Escribe tu solución aquí\n    return -1;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [[10, 20, 30, 40], 30], salidaEsperada: 2, visible: true },
      { argumentos: [[5, 15, 25], 5], salidaEsperada: 0, visible: true },
      { argumentos: [[1, 2, 3], 9], salidaEsperada: -1, visible: false },
      { argumentos: [[7], 7], salidaEsperada: 0, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Contar incrementos consecutivos (con error)',
    descripcion:
      'Se les da una función que debería contar cuántas veces un número de la lista es mayor que el número inmediatamente anterior, pero tiene un error: el bucle empieza en el índice 0, por lo que al comparar el primer elemento termina comparándolo contra el elemento anterior a él (que no existe). Deben corregir el índice en el que empieza el bucle.',
    dificultad: 'Intermedio',
    categoriaProblema: 'debugging',
    orden: 13,
    grupo: 'invitado_junior',
    puntos: 20,
    parametros: [{ nombre: 'numeros', tipo: 'list<int>' }],
    tipoRetorno: 'int',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'contar_incrementos',
        codigoInicial:
          'def contar_incrementos(numeros):\n    contador = 0\n    for i in range(len(numeros)):\n        if numeros[i] > numeros[i - 1]:   # bug: cuando i=0, compara con el último elemento\n            contador += 1\n    return contador\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'contarIncrementos',
        codigoInicial:
          'function contarIncrementos(numeros) {\n  let contador = 0;\n  for (let i = 0; i < numeros.length; i++) {\n    if (numeros[i] > numeros[i - 1]) {   // bug: el bucle debería iniciar en i=1, no en 0\n      contador++;\n    }\n  }\n  return contador;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'contarIncrementos',
        codigoInicial:
          '  public static int contarIncrementos(List<Integer> numeros) {\n    int contador = 0;\n    for (int i = 0; i < numeros.size(); i++) {\n      if (numeros.get(i) > numeros.get(i - 1)) {   // bug: el bucle debería iniciar en i=1, no en 0\n        contador++;\n      }\n    }\n    return contador;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'ContarIncrementos',
        codigoInicial:
          '  static int ContarIncrementos(List<int> numeros) {\n    int contador = 0;\n    for (int i = 0; i < numeros.Count; i++) {\n      if (numeros[i] > numeros[i - 1]) {   // bug: el bucle debería iniciar en i=1, no en 0\n        contador++;\n      }\n    }\n    return contador;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'contarIncrementos',
        codigoInicial:
          'function contarIncrementos($numeros) {\n    $contador = 0;\n    for ($i = 0; $i < count($numeros); $i++) {\n        if ($numeros[$i] > $numeros[$i - 1]) {   // bug: el bucle debería iniciar en i=1, no en 0\n            $contador++;\n        }\n    }\n    return $contador;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [[1, 3, 2, 5, 4]], salidaEsperada: 2, visible: true },
      { argumentos: [[5, 4, 3, 2, 1]], salidaEsperada: 0, visible: true },
      { argumentos: [[1, 2, 3, 4, 5]], salidaEsperada: 4, visible: false },
      { argumentos: [[3, 3, 3]], salidaEsperada: 0, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Combinar dos listas alternando elementos',
    descripcion:
      'Escribe una función que reciba dos listas de números y devuelva una nueva lista combinando sus elementos alternando uno de cada lista; si una lista es más corta que la otra, se agregan al final los elementos restantes de la más larga.',
    dificultad: 'Difícil',
    categoriaProblema: 'normal',
    orden: 14,
    grupo: 'invitado_junior',
    puntos: 30,
    parametros: [
      { nombre: 'lista1', tipo: 'list<int>' },
      { nombre: 'lista2', tipo: 'list<int>' },
    ],
    tipoRetorno: 'list<int>',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'combinar_alternando',
        codigoInicial:
          'def combinar_alternando(lista1, lista2):\n    # Escribe tu solución aquí\n    return []\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'combinarAlternando',
        codigoInicial:
          'function combinarAlternando(lista1, lista2) {\n  // Escribe tu solución aquí\n  return [];\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'combinarAlternando',
        codigoInicial:
          '  public static List<Integer> combinarAlternando(List<Integer> lista1, List<Integer> lista2) {\n    // Escribe tu solución aquí\n    return new ArrayList<>();\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'CombinarAlternando',
        codigoInicial:
          '  static List<int> CombinarAlternando(List<int> lista1, List<int> lista2) {\n    // Escribe tu solución aquí\n    return new List<int>();\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'combinarAlternando',
        codigoInicial:
          'function combinarAlternando($lista1, $lista2) {\n    // Escribe tu solución aquí\n    return [];\n}\n',
      },
    ],
    casosPrueba: [
      {
        argumentos: [
          [1, 3, 5],
          [2, 4, 6],
        ],
        salidaEsperada: [1, 2, 3, 4, 5, 6],
        visible: true,
      },
      {
        argumentos: [
          [1, 2],
          [10, 20, 30],
        ],
        salidaEsperada: [1, 10, 2, 20, 30],
        visible: true,
      },
      { argumentos: [[], [1, 2]], salidaEsperada: [1, 2], visible: false },
      { argumentos: [[7], []], salidaEsperada: [7], visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Suma hasta el primer negativo (con error)',
    descripcion:
      'Se les da una función que debería sumar los números de una lista hasta encontrar el primer número negativo (sin incluirlo), pero tiene un error: la variable que acumula la suma se declara dentro del bucle, por lo que se reinicia a 0 en cada vuelta y nunca acumula el total real. Deben corregir dónde se inicializa esa variable.',
    dificultad: 'Fácil',
    categoriaProblema: 'debugging',
    orden: 15,
    grupo: 'invitado_junior',
    puntos: 10,
    parametros: [{ nombre: 'numeros', tipo: 'list<int>' }],
    tipoRetorno: 'int',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'suma_hasta_negativo',
        codigoInicial:
          'def suma_hasta_negativo(numeros):\n    for n in numeros:\n        suma = 0   # bug: debería estar declarado ANTES del for, no dentro\n        if n < 0:\n            break\n        suma += n\n    return suma\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'sumaHastaNegativo',
        codigoInicial:
          'function sumaHastaNegativo(numeros) {\n  for (const n of numeros) {\n    var suma = 0;   // bug: debería estar declarado antes del for, no dentro\n    if (n < 0) {\n      break;\n    }\n    suma += n;\n  }\n  return suma;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'sumaHastaNegativo',
        codigoInicial:
          '  public static int sumaHastaNegativo(List<Integer> numeros) {\n    int suma = 0;\n    for (int n : numeros) {\n      suma = 0;   // bug: se reinicia en cada vuelta en vez de acumular\n      if (n < 0) {\n        break;\n      }\n      suma += n;\n    }\n    return suma;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'SumaHastaNegativo',
        codigoInicial:
          '  static int SumaHastaNegativo(List<int> numeros) {\n    int suma = 0;\n    foreach (int n in numeros) {\n      suma = 0;   // bug: se reinicia en cada vuelta en vez de acumular\n      if (n < 0) {\n        break;\n      }\n      suma += n;\n    }\n    return suma;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'sumaHastaNegativo',
        codigoInicial:
          'function sumaHastaNegativo($numeros) {\n    foreach ($numeros as $n) {\n        $suma = 0;   // bug: debería inicializarse antes del foreach, no en cada vuelta\n        if ($n < 0) {\n            break;\n        }\n        $suma += $n;\n    }\n    return $suma;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [[1, 2, 3, -1, 5]], salidaEsperada: 6, visible: true },
      { argumentos: [[4, 5, 6]], salidaEsperada: 15, visible: true },
      { argumentos: [[2, 7, 1, 8]], salidaEsperada: 18, visible: false },
      { argumentos: [[9, -2, 3]], salidaEsperada: 9, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Suma por bloques',
    descripcion:
      'Escribe una función que reciba una lista de números y un tamaño de bloque, y devuelva una lista donde cada elemento es la suma de un bloque consecutivo de esa cantidad de números; el último bloque puede tener menos elementos si la lista no es múltiplo exacto del tamaño de bloque.',
    dificultad: 'Difícil',
    categoriaProblema: 'normal',
    orden: 16,
    grupo: 'invitado_junior',
    puntos: 30,
    parametros: [
      { nombre: 'numeros', tipo: 'list<int>' },
      { nombre: 'tamano_bloque', tipo: 'int' },
    ],
    tipoRetorno: 'list<int>',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'suma_bloques',
        codigoInicial:
          'def suma_bloques(numeros, tamano_bloque):\n    # Escribe tu solución aquí\n    return []\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'sumaBloques',
        codigoInicial:
          'function sumaBloques(numeros, tamanoBloque) {\n  // Escribe tu solución aquí\n  return [];\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'sumaBloques',
        codigoInicial:
          '  public static List<Integer> sumaBloques(List<Integer> numeros, int tamanoBloque) {\n    // Escribe tu solución aquí\n    return new ArrayList<>();\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'SumaBloques',
        codigoInicial:
          '  static List<int> SumaBloques(List<int> numeros, int tamanoBloque) {\n    // Escribe tu solución aquí\n    return new List<int>();\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'sumaBloques',
        codigoInicial:
          'function sumaBloques($numeros, $tamanoBloque) {\n    // Escribe tu solución aquí\n    return [];\n}\n',
      },
    ],
    casosPrueba: [
      {
        argumentos: [[1, 2, 3, 4, 5, 6], 2],
        salidaEsperada: [3, 7, 11],
        visible: true,
      },
      {
        argumentos: [[1, 2, 3, 4, 5], 2],
        salidaEsperada: [3, 7, 5],
        visible: true,
      },
      { argumentos: [[1, 2, 3], 5], salidaEsperada: [6], visible: false },
      {
        argumentos: [[10, 20, 30, 40], 1],
        salidaEsperada: [10, 20, 30, 40],
        visible: false,
      },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Verificar si una lista es simétrica',
    descripcion:
      'Escribe una función que reciba una lista de números y devuelva si es simétrica, es decir, si se lee igual desde el principio que desde el final.',
    dificultad: 'Difícil',
    categoriaProblema: 'normal',
    orden: 1,
    grupo: 'senior',
    puntos: 30,
    parametros: [{ nombre: 'numeros', tipo: 'list<int>' }],
    tipoRetorno: 'bool',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'es_simetrica',
        codigoInicial:
          'def es_simetrica(numeros):\n    # Escribe tu solución aquí\n    return False\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'esSimetrica',
        codigoInicial:
          'function esSimetrica(numeros) {\n  // Escribe tu solución aquí\n  return false;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'esSimetrica',
        codigoInicial:
          '  public static boolean esSimetrica(List<Integer> numeros) {\n    // Escribe tu solución aquí\n    return false;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'EsSimetrica',
        codigoInicial:
          '  static bool EsSimetrica(List<int> numeros) {\n    // Escribe tu solución aquí\n    return false;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'esSimetrica',
        codigoInicial:
          'function esSimetrica($numeros) {\n    // Escribe tu solución aquí\n    return false;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [[1, 2, 3, 2, 1]], salidaEsperada: true, visible: true },
      { argumentos: [[1, 2, 3]], salidaEsperada: false, visible: true },
      { argumentos: [[5, 5]], salidaEsperada: true, visible: false },
      { argumentos: [[7]], salidaEsperada: true, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Racha más larga de números positivos (con error)',
    descripcion:
      "Se les da una función que debería encontrar la racha más larga de números positivos consecutivos dentro de una lista. Tiene un error: la línea que reinicia la racha actual a 0 está fuera del 'else', así que se ejecuta en cada iteración sin importar si el número es positivo o no, y nunca deja que la racha crezca más de 1. Deben encontrarlo y corregirlo.",
    dificultad: 'Difícil',
    categoriaProblema: 'debugging',
    orden: 2,
    grupo: 'senior',
    puntos: 30,
    parametros: [{ nombre: 'numeros', tipo: 'list<int>' }],
    tipoRetorno: 'int',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'racha_mas_larga',
        codigoInicial:
          'def racha_mas_larga(numeros):\n    racha_actual = 0\n    racha_maxima = 0\n    for n in numeros:\n        if n > 0:\n            racha_actual += 1\n            if racha_actual > racha_maxima:\n                racha_maxima = racha_actual\n        racha_actual = 0   # bug: debería estar dentro de un "else", no siempre\n    return racha_maxima\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'rachaMasLarga',
        codigoInicial:
          'function rachaMasLarga(numeros) {\n  let rachaActual = 0;\n  let rachaMaxima = 0;\n  for (const n of numeros) {\n    if (n > 0) {\n      rachaActual++;\n      if (rachaActual > rachaMaxima) {\n        rachaMaxima = rachaActual;\n      }\n    }\n    rachaActual = 0;   // bug: debería estar dentro de un "else", no siempre\n  }\n  return rachaMaxima;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'rachaMasLarga',
        codigoInicial:
          '  public static int rachaMasLarga(List<Integer> numeros) {\n    int rachaActual = 0;\n    int rachaMaxima = 0;\n    for (int n : numeros) {\n      if (n > 0) {\n        rachaActual++;\n        if (rachaActual > rachaMaxima) {\n          rachaMaxima = rachaActual;\n        }\n      }\n      rachaActual = 0;   // bug: debería estar dentro de un "else", no siempre\n    }\n    return rachaMaxima;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'RachaMasLarga',
        codigoInicial:
          '  static int RachaMasLarga(List<int> numeros) {\n    int rachaActual = 0;\n    int rachaMaxima = 0;\n    foreach (int n in numeros) {\n      if (n > 0) {\n        rachaActual++;\n        if (rachaActual > rachaMaxima) {\n          rachaMaxima = rachaActual;\n        }\n      }\n      rachaActual = 0;   // bug: debería estar dentro de un "else", no siempre\n    }\n    return rachaMaxima;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'rachaMasLarga',
        codigoInicial:
          'function rachaMasLarga($numeros) {\n    $rachaActual = 0;\n    $rachaMaxima = 0;\n    foreach ($numeros as $n) {\n        if ($n > 0) {\n            $rachaActual++;\n            if ($rachaActual > $rachaMaxima) {\n                $rachaMaxima = $rachaActual;\n            }\n        }\n        $rachaActual = 0;   // bug: debería estar dentro de un "else", no siempre\n    }\n    return $rachaMaxima;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [[1, 2, -1, 3, 4, 5]], salidaEsperada: 3, visible: true },
      { argumentos: [[-1, -2, -3]], salidaEsperada: 0, visible: true },
      { argumentos: [[1, 2, 3]], salidaEsperada: 3, visible: false },
      {
        argumentos: [[1, -1, 2, 2, -1, 3, 3, 3]],
        salidaEsperada: 3,
        visible: false,
      },
    ],
  })

  await crearProblemaSeed({
    titulo: '¿Existe un par que sume el objetivo?',
    descripcion:
      'Escribe una función que reciba una lista de números y un valor objetivo, y determine si existen dos elementos distintos en la lista (por posición, no necesariamente por valor) cuya suma sea igual al objetivo.',
    dificultad: 'Intermedio',
    categoriaProblema: 'normal',
    orden: 3,
    grupo: 'senior',
    puntos: 20,
    parametros: [
      { nombre: 'numeros', tipo: 'list<int>' },
      { nombre: 'objetivo', tipo: 'int' },
    ],
    tipoRetorno: 'bool',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'hay_par_que_suma',
        codigoInicial:
          'def hay_par_que_suma(numeros, objetivo):\n    # Escribe tu solución aquí\n    return False\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'hayParQueSuma',
        codigoInicial:
          'function hayParQueSuma(numeros, objetivo) {\n  // Escribe tu solución aquí\n  return false;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'hayParQueSuma',
        codigoInicial:
          '  public static boolean hayParQueSuma(List<Integer> numeros, int objetivo) {\n    // Escribe tu solución aquí\n    return false;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'HayParQueSuma',
        codigoInicial:
          '  static bool HayParQueSuma(List<int> numeros, int objetivo) {\n    // Escribe tu solución aquí\n    return false;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'hayParQueSuma',
        codigoInicial:
          'function hayParQueSuma($numeros, $objetivo) {\n    // Escribe tu solución aquí\n    return false;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [[2, 7, 11, 15], 9], salidaEsperada: true, visible: true },
      { argumentos: [[1, 2, 3], 10], salidaEsperada: false, visible: true },
      { argumentos: [[3, 3], 6], salidaEsperada: true, visible: false },
      { argumentos: [[-1, 5, 2], 1], salidaEsperada: true, visible: false },
      { argumentos: [[1], 2], salidaEsperada: false, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Elemento más frecuente',
    descripcion:
      'Escribe una función que reciba una lista de números y devuelva el que aparece con más frecuencia. Si hay empate entre dos o más números con la misma frecuencia máxima, se debe devolver el que aparece primero en la lista (en orden de recorrido).',
    dificultad: 'Difícil',
    categoriaProblema: 'normal',
    orden: 4,
    grupo: 'senior',
    puntos: 30,
    parametros: [{ nombre: 'numeros', tipo: 'list<int>' }],
    tipoRetorno: 'int',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'elemento_mas_frecuente',
        codigoInicial:
          'def elemento_mas_frecuente(numeros):\n    # Escribe tu solución aquí\n    return 0\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'elementoMasFrecuente',
        codigoInicial:
          'function elementoMasFrecuente(numeros) {\n  // Escribe tu solución aquí\n  return 0;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'elementoMasFrecuente',
        codigoInicial:
          '  public static int elementoMasFrecuente(List<Integer> numeros) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'ElementoMasFrecuente',
        codigoInicial:
          '  static int ElementoMasFrecuente(List<int> numeros) {\n    // Escribe tu solución aquí\n    return 0;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'elementoMasFrecuente',
        codigoInicial:
          'function elementoMasFrecuente($numeros) {\n    // Escribe tu solución aquí\n    return 0;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [[1, 3, 2, 3, 4, 3, 2]], salidaEsperada: 3, visible: true },
      { argumentos: [[7, 7, 1, 1, 1, 7]], salidaEsperada: 7, visible: true },
      { argumentos: [[5, 5, 5, 5]], salidaEsperada: 5, visible: false },
      { argumentos: [[1, 2, 3]], salidaEsperada: 1, visible: false },
      { argumentos: [[2, 2, 9, 9, 9]], salidaEsperada: 9, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: '¿Tiene duplicados? (con error)',
    descripcion:
      "Se les da una función que debería determinar si una lista tiene algún elemento repetido. Tiene un error: agrega cada número al conjunto de 'vistos' antes de verificar si ya estaba ahí, así que la condición siempre resulta verdadera (el elemento que se acaba de agregar, obviamente ya está). Deben encontrarlo y corregirlo.",
    dificultad: 'Intermedio',
    categoriaProblema: 'debugging',
    orden: 5,
    grupo: 'senior',
    puntos: 20,
    parametros: [{ nombre: 'numeros', tipo: 'list<int>' }],
    tipoRetorno: 'bool',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'tiene_duplicados',
        codigoInicial:
          'def tiene_duplicados(numeros):\n    vistos = set()\n    for n in numeros:\n        vistos.add(n)\n        if n in vistos:   # bug: siempre es True porque ya se agregó justo arriba\n            return True\n    return False\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'tieneDuplicados',
        codigoInicial:
          'function tieneDuplicados(numeros) {\n  const vistos = new Set();\n  for (const n of numeros) {\n    vistos.add(n);\n    if (vistos.has(n)) {   // bug: siempre es true porque ya se agregó justo arriba\n      return true;\n    }\n  }\n  return false;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'tieneDuplicados',
        codigoInicial:
          '  public static boolean tieneDuplicados(List<Integer> numeros) {\n    Set<Integer> vistos = new HashSet<>();\n    for (int n : numeros) {\n      vistos.add(n);\n      if (vistos.contains(n)) {   // bug: siempre es true porque ya se agregó justo arriba\n        return true;\n      }\n    }\n    return false;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'TieneDuplicados',
        codigoInicial:
          '  static bool TieneDuplicados(List<int> numeros) {\n    HashSet<int> vistos = new HashSet<int>();\n    foreach (int n in numeros) {\n      vistos.Add(n);\n      if (vistos.Contains(n)) {   // bug: siempre es true porque ya se agregó justo arriba\n        return true;\n      }\n    }\n    return false;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'tieneDuplicados',
        codigoInicial:
          'function tieneDuplicados($numeros) {\n    $vistos = [];\n    foreach ($numeros as $n) {\n        $vistos[$n] = true;\n        if (isset($vistos[$n])) {   // bug: siempre es true porque ya se agregó justo arriba\n            return true;\n        }\n    }\n    return false;\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: [[1, 2, 3, 2]], salidaEsperada: true, visible: true },
      { argumentos: [[1, 2, 3, 4]], salidaEsperada: false, visible: true },
      { argumentos: [[5]], salidaEsperada: false, visible: false },
      { argumentos: [[1, 1]], salidaEsperada: true, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Intercambiar primer y último elemento (con error)',
    descripcion:
      'Se les da una función que debería intercambiar el primer y el último elemento de una lista. Tiene un error: no usa una variable temporal para guardar el valor original antes de sobreescribirlo, así que el primer elemento pierde su valor original antes de que se use para actualizar el último. Deben encontrarlo y corregirlo.',
    dificultad: 'Intermedio',
    categoriaProblema: 'debugging',
    orden: 6,
    grupo: 'senior',
    puntos: 20,
    parametros: [{ nombre: 'numeros', tipo: 'list<int>' }],
    tipoRetorno: 'list<int>',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'invertir_primero_ultimo',
        codigoInicial:
          'def invertir_primero_ultimo(numeros):\n    numeros = numeros.copy()\n    if len(numeros) < 2:\n        return numeros\n    numeros[0] = numeros[-1]\n    numeros[-1] = numeros[0]   # bug: numeros[0] ya fue sobreescrito arriba\n    return numeros\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'invertirPrimeroUltimo',
        codigoInicial:
          'function invertirPrimeroUltimo(numeros) {\n  const resultado = numeros.slice();\n  if (resultado.length < 2) {\n    return resultado;\n  }\n  const ultimo = resultado.length - 1;\n  resultado[0] = resultado[ultimo];\n  resultado[ultimo] = resultado[0];   // bug: resultado[0] ya fue sobreescrito arriba\n  return resultado;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'invertirPrimeroUltimo',
        codigoInicial:
          '  public static List<Integer> invertirPrimeroUltimo(List<Integer> numeros) {\n    List<Integer> resultado = new ArrayList<>(numeros);\n    if (resultado.size() < 2) {\n      return resultado;\n    }\n    int ultimo = resultado.size() - 1;\n    resultado.set(0, resultado.get(ultimo));\n    resultado.set(ultimo, resultado.get(0));   // bug: resultado.get(0) ya fue sobreescrito arriba\n    return resultado;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'InvertirPrimeroUltimo',
        codigoInicial:
          '  static List<int> InvertirPrimeroUltimo(List<int> numeros) {\n    List<int> resultado = new List<int>(numeros);\n    if (resultado.Count < 2) {\n      return resultado;\n    }\n    int ultimo = resultado.Count - 1;\n    resultado[0] = resultado[ultimo];\n    resultado[ultimo] = resultado[0];   // bug: resultado[0] ya fue sobreescrito arriba\n    return resultado;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'invertirPrimeroUltimo',
        codigoInicial:
          'function invertirPrimeroUltimo($numeros) {\n    $resultado = $numeros;\n    $n = count($resultado);\n    if ($n < 2) {\n        return $resultado;\n    }\n    $ultimo = $n - 1;\n    $resultado[0] = $resultado[$ultimo];\n    $resultado[$ultimo] = $resultado[0];   // bug: resultado[0] ya fue sobreescrito arriba\n    return $resultado;\n}\n',
      },
    ],
    casosPrueba: [
      {
        argumentos: [[1, 2, 3, 4]],
        salidaEsperada: [4, 2, 3, 1],
        visible: true,
      },
      { argumentos: [[5, 6]], salidaEsperada: [6, 5], visible: true },
      { argumentos: [[9]], salidaEsperada: [9], visible: false },
      {
        argumentos: [[10, 20, 30, 40, 50]],
        salidaEsperada: [50, 20, 30, 40, 10],
        visible: false,
      },
    ],
  })

  await crearProblemaSeed({
    titulo: '¿Es permutación?',
    descripcion:
      'Escribe una función que reciba dos listas de números y determine si una es una permutación de la otra (es decir, si contienen exactamente los mismos elementos con las mismas frecuencias, sin importar el orden).',
    dificultad: 'Difícil',
    categoriaProblema: 'normal',
    orden: 7,
    grupo: 'senior',
    puntos: 30,
    parametros: [
      { nombre: 'lista1', tipo: 'list<int>' },
      { nombre: 'lista2', tipo: 'list<int>' },
    ],
    tipoRetorno: 'bool',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'es_permutacion',
        codigoInicial:
          'def es_permutacion(lista1, lista2):\n    # Escribe tu solución aquí\n    return False\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'esPermutacion',
        codigoInicial:
          'function esPermutacion(lista1, lista2) {\n  // Escribe tu solución aquí\n  return false;\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'esPermutacion',
        codigoInicial:
          '  public static boolean esPermutacion(List<Integer> lista1, List<Integer> lista2) {\n    // Escribe tu solución aquí\n    return false;\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'EsPermutacion',
        codigoInicial:
          '  static bool EsPermutacion(List<int> lista1, List<int> lista2) {\n    // Escribe tu solución aquí\n    return false;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'esPermutacion',
        codigoInicial:
          'function esPermutacion($lista1, $lista2) {\n    // Escribe tu solución aquí\n    return false;\n}\n',
      },
    ],
    casosPrueba: [
      {
        argumentos: [
          [1, 2, 3],
          [3, 1, 2],
        ],
        salidaEsperada: true,
        visible: true,
      },
      {
        argumentos: [
          [1, 2, 3],
          [1, 2, 4],
        ],
        salidaEsperada: false,
        visible: true,
      },
      {
        argumentos: [
          [1, 1, 2],
          [1, 2, 2],
        ],
        salidaEsperada: false,
        visible: false,
      },
      { argumentos: [[], []], salidaEsperada: true, visible: false },
      { argumentos: [[5], [5]], salidaEsperada: true, visible: false },
    ],
  })

  await crearProblemaSeed({
    titulo: 'Contar vocales por palabra',
    descripcion:
      'Escribe una función que reciba un texto y devuelva una lista con la cantidad de vocales (a, e, i, o, u, mayúsculas o minúsculas) que tiene cada palabra del texto, en el mismo orden en que aparecen.',
    dificultad: 'Intermedio',
    categoriaProblema: 'normal',
    orden: 8,
    grupo: 'senior',
    puntos: 20,
    parametros: [{ nombre: 'texto', tipo: 'string' }],
    tipoRetorno: 'list<int>',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'contar_vocales_por_palabra',
        codigoInicial:
          'def contar_vocales_por_palabra(texto):\n    # Escribe tu solución aquí\n    return []\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'contarVocalesPorPalabra',
        codigoInicial:
          'function contarVocalesPorPalabra(texto) {\n  // Escribe tu solución aquí\n  return [];\n}\n',
      },
      {
        lenguaje: 'java',
        nombreFuncion: 'contarVocalesPorPalabra',
        codigoInicial:
          '  public static List<Integer> contarVocalesPorPalabra(String texto) {\n    // Escribe tu solución aquí\n    return new ArrayList<>();\n  }\n',
      },
      {
        lenguaje: 'csharp',
        nombreFuncion: 'ContarVocalesPorPalabra',
        codigoInicial:
          '  static List<int> ContarVocalesPorPalabra(string texto) {\n    // Escribe tu solución aquí\n    return new List<int>();\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'contarVocalesPorPalabra',
        codigoInicial:
          'function contarVocalesPorPalabra($texto) {\n    // Escribe tu solución aquí\n    return [];\n}\n',
      },
    ],
    casosPrueba: [
      { argumentos: ['hola mundo'], salidaEsperada: [2, 2], visible: true },
      {
        argumentos: ['el sol brilla hoy'],
        salidaEsperada: [1, 1, 2, 1],
        visible: true,
      },
      { argumentos: ['Programacion'], salidaEsperada: [5], visible: false },
      { argumentos: ['xyz'], salidaEsperada: [0], visible: false },
    ],
  })

  console.log('\nListo. Credenciales de prueba:\n')
  console.log(
    `  Admin        -> correo: admin@torneo.local        contraseña: ${adminContrasena}`,
  )
  console.log(
    `  Participante -> correo: participante@torneo.local contraseña: ${participanteContrasena}`,
  )
  console.log(
    `  Admins masivos       -> admin1..admin5@torneo.local        contraseña: ${CONTRASENA_MASIVA}`,
  )
  console.log(
    `  Participantes masivos -> usuario1..usuario40@torneo.local  contraseña: ${CONTRASENA_MASIVA}`,
  )
  console.log(
    '  (usuario1-13: invitado, usuario14-26: junior, usuario27-40: senior)',
  )
  console.log(
    '\n24 problemas creados (8 invitado + 8 junior en el grupo invitado_junior, 8 senior).',
  )
  console.log(
    'Todas las cuentas ya están marcadas como "ingresadas" (check-in hecho).',
  )
  console.log(`admin id: ${adminId}`)
  console.log(`participante id: ${participanteId}`)

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
