import {
  mysqlTable,
  text,
  varchar,
  timestamp,
  int,
  boolean,
  json,
  mysqlEnum,
  unique,
} from 'drizzle-orm/mysql-core'
import type { Parametro, Valor } from '../judge/tipos'
import type { ResultadoCaso } from '../judge/verdict'

// Tablas centrales de Better Auth
export const usuarios = mysqlTable('usuario', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: text('nombre').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('correo_verificado').notNull().default(false),
  image: text('imagen'),
  createdAt: timestamp('creado_en').notNull().defaultNow(),
  updatedAt: timestamp('actualizado_en').notNull().defaultNow(),
  rol: mysqlEnum('rol', ['participante', 'admin']).notNull().default('participante'),
  categoria: mysqlEnum('categoria', ['invitado', 'junior', 'senior']).notNull(),
  carnet: text('carnet'),
  semestre: mysqlEnum('semestre', [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
  ]),
  tokenIngreso: varchar('token_ingreso', { length: 255 })
    .$defaultFn(() => crypto.randomUUID())
    .notNull()
    .unique(),
  ingresadoEn: timestamp('ingresado_en'),
  preguntasIaUsadas: int('preguntas_ia_usadas').notNull().default(0),
})

export const sesiones = mysqlTable('sesion', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('usuario_id', { length: 36 })
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expira_en').notNull(),
  createdAt: timestamp('creado_en').notNull().defaultNow(),
  updatedAt: timestamp('actualizado_en').notNull().defaultNow(),
  ipAddress: text('direccion_ip'),
  userAgent: text('agente_usuario'),
})

export const cuentas = mysqlTable('cuenta', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('usuario_id', { length: 36 })
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  accountId: text('id_cuenta_proveedor').notNull(),
  providerId: text('id_proveedor').notNull(),
  password: text('contrasena'),
  accessToken: text('token_acceso'),
  refreshToken: text('token_refresco'),
  accessTokenExpiresAt: timestamp('token_acceso_expira_en'),
  refreshTokenExpiresAt: timestamp('token_refresco_expira_en'),
  scope: text('alcance'),
  idToken: text('id_token'),
  createdAt: timestamp('creado_en').notNull().defaultNow(),
  updatedAt: timestamp('actualizado_en').notNull().defaultNow(),
})

export const verificaciones = mysqlTable('verificacion', {
  id: varchar('id', { length: 36 }).primaryKey(),
  identifier: text('identificador').notNull(),
  value: text('valor').notNull(),
  expiresAt: timestamp('expira_en').notNull(),
  createdAt: timestamp('creado_en').notNull().defaultNow(),
})

// Tablas de dominio
export const problemas = mysqlTable('problemas', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  titulo: text('titulo').notNull(),
  descripcion: text('descripcion').notNull(),
  dificultad: text('dificultad').notNull(),
  orden: int('orden').notNull().default(0),
  grupo: mysqlEnum('grupo', ['invitado_junior', 'senior']).notNull(),
  puntos: int('puntos').notNull().default(10),
  parametros: json('parametros').$type<Parametro[]>().notNull(),
  tipoRetorno: mysqlEnum('tipo_retorno', [
    'int',
    'float',
    'bool',
    'string',
    'list<int>',
    'list<float>',
    'list<bool>',
    'list<string>',
  ]).notNull(),
})

export const problemaLenguajes = mysqlTable(
  'problema_lenguajes',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    problemaId: varchar('problema_id', { length: 36 })
      .notNull()
      .references(() => problemas.id, { onDelete: 'cascade' }),
    lenguaje: mysqlEnum('lenguaje', ['python', 'javascript', 'java', 'csharp', 'php']).notNull(),
    nombreFuncion: text('nombre_funcion').notNull(),
    codigoInicial: text('codigo_inicial').notNull(),
  },
  (table) => [unique('problema_lenguajes_unico').on(table.problemaId, table.lenguaje)],
)

export const casosPrueba = mysqlTable('casos_prueba', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  problemaId: varchar('problema_id', { length: 36 })
    .notNull()
    .references(() => problemas.id, { onDelete: 'cascade' }),
  argumentos: json('argumentos').$type<Valor[]>().notNull(),
  salidaEsperada: json('salida_esperada').$type<Valor>().notNull(),
  visible: boolean('visible').notNull().default(true),
})

export const envios = mysqlTable('envios', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  usuarioId: varchar('usuario_id', { length: 36 })
    .notNull()
    .references(() => usuarios.id),
  problemaId: varchar('problema_id', { length: 36 })
    .notNull()
    .references(() => problemas.id),
  codigo: text('codigo').notNull(),
  lenguaje: text('lenguaje').notNull(),
  estado: mysqlEnum('estado', [
    'pendiente',
    'aceptado',
    'respuesta_incorrecta',
    'error_ejecucion',
    'tiempo_excedido',
  ])
    .notNull()
    .default('pendiente'),
  resultados: json('resultados').$type<ResultadoCaso[]>(),
  veredictoOriginal: mysqlEnum('veredicto_original', [
    'pendiente',
    'aceptado',
    'respuesta_incorrecta',
    'error_ejecucion',
    'tiempo_excedido',
  ]),
  aprobadoPorId: varchar('aprobado_por_id', { length: 36 }).references(() => usuarios.id, {
    onDelete: 'set null',
  }),
  aprobadoEn: timestamp('aprobado_en'),
  comentarioClaude: text('comentario_claude'),
  creadoEn: timestamp('creado_en').notNull().defaultNow(),
})

export const preguntasIa = mysqlTable('preguntas_ia', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  usuarioId: varchar('usuario_id', { length: 36 })
    .notNull()
    .references(() => usuarios.id),
  problemaId: varchar('problema_id', { length: 36 }).references(() => problemas.id),
  pregunta: text('pregunta').notNull(),
  respuesta: text('respuesta').notNull(),
  creadoEn: timestamp('creado_en').notNull().defaultNow(),
})

export const corridas = mysqlTable(
  'corridas',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    usuarioId: varchar('usuario_id', { length: 36 })
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    problemaId: varchar('problema_id', { length: 36 })
      .notNull()
      .references(() => problemas.id, { onDelete: 'cascade' }),
    contador: int('contador').notNull().default(0),
  },
  (table) => [unique('corridas_usuario_problema_unico').on(table.usuarioId, table.problemaId)],
)

export const estadoTorneo = mysqlTable('estado_torneo', {
  id: int('id').primaryKey().default(1),
  iniciadoEn: timestamp('iniciado_en'),
})
