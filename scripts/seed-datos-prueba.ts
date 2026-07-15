import 'dotenv/config'
import { hashPassword } from 'better-auth/crypto'
import { db } from '../src/server/db/client'
import { usuarios, cuentas, problemas, problemaLenguajes, casosPrueba } from '../src/server/db/schema'
import { generarContrasenaAleatoria } from '../src/server/auth/password'
import type { Parametro, TipoDato, Valor } from '../src/server/judge/tipos'

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

type LenguajeSeed = { lenguaje: 'python' | 'javascript' | 'java' | 'csharp' | 'php'; nombreFuncion: string; codigoInicial: string }
type CasoSeed = { argumentos: Valor[]; salidaEsperada: Valor; visible: boolean }

async function crearProblemaSeed(input: {
  titulo: string
  descripcion: string
  dificultad: string
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

  await crearProblemaSeed({
    titulo: 'Suma de dos números',
    descripcion:
      'Escribe una función que reciba dos números enteros a y b, y devuelva su suma.',
    dificultad: 'easy',
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
        codigoInicial: 'def suma_dos_numeros(a, b):\n    # Escribe tu solución aquí\n    return 0\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'sumaDosNumeros',
        codigoInicial: 'function sumaDosNumeros(a, b) {\n  // Escribe tu solución aquí\n  return 0;\n}\n',
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
        codigoInicial: 'function sumaDosNumeros($a, $b) {\n    // Escribe tu solución aquí\n    return 0;\n}\n',
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
    dificultad: 'medium',
    orden: 2,
    grupo: 'invitado_junior',
    puntos: 15,
    parametros: [{ nombre: 'n', tipo: 'int' }],
    tipoRetorno: 'bool',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'es_primo',
        codigoInicial: 'def es_primo(n):\n    # Escribe tu solución aquí\n    return False\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'esPrimo',
        codigoInicial: 'function esPrimo(n) {\n  // Escribe tu solución aquí\n  return false;\n}\n',
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
        codigoInicial: '  static bool EsPrimo(int n) {\n    // Escribe tu solución aquí\n    return false;\n  }\n',
      },
      {
        lenguaje: 'php',
        nombreFuncion: 'esPrimo',
        codigoInicial: 'function esPrimo($n) {\n    // Escribe tu solución aquí\n    return false;\n}\n',
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
    dificultad: 'medium',
    orden: 3,
    grupo: 'invitado_junior',
    puntos: 20,
    parametros: [{ nombre: 'numeros', tipo: 'list<int>' }],
    tipoRetorno: 'int',
    lenguajes: [
      {
        lenguaje: 'python',
        nombreFuncion: 'maximo_lista',
        codigoInicial: 'def maximo_lista(numeros):\n    # Escribe tu solución aquí\n    return 0\n',
      },
      {
        lenguaje: 'javascript',
        nombreFuncion: 'maximoLista',
        codigoInicial: 'function maximoLista(numeros) {\n  // Escribe tu solución aquí\n  return 0;\n}\n',
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
        codigoInicial: 'function maximoLista($numeros) {\n    // Escribe tu solución aquí\n    return 0;\n}\n',
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

  console.log('\nListo. Credenciales de prueba:\n')
  console.log(`  Admin        -> correo: admin@torneo.local        contraseña: ${adminContrasena}`)
  console.log(`  Participante -> correo: participante@torneo.local contraseña: ${participanteContrasena}`)
  console.log('\n3 problemas creados (Suma de dos números, Es número primo, Máximo de una lista).')
  console.log('Ambas cuentas ya están marcadas como "ingresadas" (check-in hecho).')
  console.log(`admin id: ${adminId}`)
  console.log(`participante id: ${participanteId}`)

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
