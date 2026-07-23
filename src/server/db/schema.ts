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
import {
  ROLES,
  CATEGORIAS,
  SEMESTRES,
  DIFICULTADES,
  CATEGORIAS_PROBLEMA,
  GRUPOS,
  LENGUAJES,
  TIPOS_DATO,
  ESTADOS_ENVIO,
  ESTADOS_PROGRESO,
} from '../../shared/dominio'
import { CLAVES_BENEFICIO, INGENIEROS } from '../../shared/beneficios'

export const torneos = mysqlTable('torneos', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  anio: int('anio').notNull().unique(),
  iniciadoEn: timestamp('iniciado_en'),
  finalizadoEn: timestamp('finalizado_en'),
  creadoEn: timestamp('creado_en').notNull().defaultNow(),
})

// Tablas centrales de Better Auth
export const usuarios = mysqlTable('usuario', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: text('nombre').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('correo_verificado').notNull().default(false),
  image: text('imagen'),
  createdAt: timestamp('creado_en').notNull().defaultNow(),
  updatedAt: timestamp('actualizado_en').notNull().defaultNow(),
  rol: mysqlEnum('rol', ROLES).notNull().default('participante'),
  categoria: mysqlEnum('categoria', CATEGORIAS).notNull(),
  carnet: text('carnet'),
  semestre: mysqlEnum('semestre', SEMESTRES),
  tokenIngreso: varchar('token_ingreso', { length: 255 })
    .$defaultFn(() => crypto.randomUUID())
    .notNull()
    .unique(),
  ingresadoEn: timestamp('ingresado_en'),
  preguntasIaUsadas: int('preguntas_ia_usadas').notNull().default(0),
  torneoId: varchar('torneo_id', { length: 36 }).references(() => torneos.id),
  correoOriginal: text('correo_original'),
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
  torneoId: varchar('torneo_id', { length: 36 }).references(() => torneos.id),
  titulo: text('titulo').notNull(),
  descripcion: text('descripcion').notNull(),
  dificultad: mysqlEnum('dificultad', DIFICULTADES).notNull(),
  categoriaProblema: mysqlEnum('categoria_problema', CATEGORIAS_PROBLEMA)
    .notNull()
    .default('normal'),
  orden: int('orden').notNull().default(0),
  grupo: mysqlEnum('grupo', GRUPOS).notNull(),
  puntos: int('puntos').notNull().default(10),
  parametros: json('parametros').$type<Parametro[]>().notNull(),
  tipoRetorno: mysqlEnum('tipo_retorno', TIPOS_DATO).notNull(),
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
    lenguaje: mysqlEnum('lenguaje', LENGUAJES).notNull(),
    nombreFuncion: text('nombre_funcion').notNull(),
    codigoInicial: text('codigo_inicial').notNull(),
  },
  (table) => [
    unique('problema_lenguajes_unico').on(table.problemaId, table.lenguaje),
  ],
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

export const envios = mysqlTable(
  'envios',
  {
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
    estado: mysqlEnum('estado', ESTADOS_ENVIO).notNull().default('pendiente'),
    estadoProgreso: mysqlEnum('estado_progreso', ESTADOS_PROGRESO)
      .notNull()
      .default('pendiente'),
    resultados: json('resultados').$type<ResultadoCaso[]>(),
    aprobadoPorId: varchar('aprobado_por_id', { length: 36 }).references(
      () => usuarios.id,
      {
        onDelete: 'set null',
      },
    ),
    aprobadoEn: timestamp('aprobado_en'),
    creadoEn: timestamp('creado_en').notNull().defaultNow(),
  },
  (table) => [
    unique('envios_usuario_problema_unico').on(
      table.usuarioId,
      table.problemaId,
    ),
  ],
)

export const preguntasIa = mysqlTable('preguntas_ia', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  usuarioId: varchar('usuario_id', { length: 36 })
    .notNull()
    .references(() => usuarios.id),
  problemaId: varchar('problema_id', { length: 36 }).references(
    () => problemas.id,
  ),
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
    ultimoCodigo: text('ultimo_codigo'),
    ultimoLenguaje: text('ultimo_lenguaje'),
    ultimoVeredicto: mysqlEnum('ultimo_veredicto', ESTADOS_ENVIO),
    ultimosResultados: json('ultimos_resultados').$type<ResultadoCaso[]>(),
    ultimaEjecucionEn: timestamp('ultima_ejecucion_en'),
  },
  (table) => [
    unique('corridas_usuario_problema_unico').on(
      table.usuarioId,
      table.problemaId,
    ),
  ],
)

export const beneficios = mysqlTable('beneficios', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  usuarioId: varchar('usuario_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  clave: mysqlEnum('clave', CLAVES_BENEFICIO).notNull(),
  asignadoEn: timestamp('asignado_en').notNull().defaultNow(),
  usadoEn: timestamp('usado_en'),
  objetivoUsuarioId: varchar('objetivo_usuario_id', { length: 36 }).references(
    () => usuarios.id,
    { onDelete: 'set null' },
  ),
  objetivoIngeniero: mysqlEnum('objetivo_ingeniero', INGENIEROS),
})
