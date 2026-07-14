import {
  mysqlTable,
  text,
  timestamp,
  int,
  boolean,
  json,
  mysqlEnum,
} from 'drizzle-orm/mysql-core'

// Tablas centrales de Better Auth
export const usuarios = mysqlTable('usuario', {
  id: text('id').primaryKey(),
  name: text('nombre').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('correo_verificado').notNull().default(false),
  image: text('imagen'),
  createdAt: timestamp('creado_en').notNull().defaultNow(),
  updatedAt: timestamp('actualizado_en').notNull().defaultNow(),
  rol: mysqlEnum('rol', ['participante', 'admin']).notNull().default('participante'),
  categoria: mysqlEnum('categoria', ['senior', 'junior']),
  tokenIngreso: text('token_ingreso')
    .$defaultFn(() => crypto.randomUUID())
    .notNull()
    .unique(),
  ingresadoEn: timestamp('ingresado_en'),
  preguntasIaUsadas: int('preguntas_ia_usadas').notNull().default(0),
})

export const sesiones = mysqlTable('sesion', {
  id: text('id').primaryKey(),
  userId: text('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expira_en').notNull(),
  createdAt: timestamp('creado_en').notNull().defaultNow(),
  updatedAt: timestamp('actualizado_en').notNull().defaultNow(),
  ipAddress: text('direccion_ip'),
  userAgent: text('agente_usuario'),
})

export const cuentas = mysqlTable('cuenta', {
  id: text('id').primaryKey(),
  userId: text('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  accountId: text('id_cuenta_proveedor').notNull(),
  providerId: text('id_proveedor').notNull(),
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
  id: text('id').primaryKey(),
  identifier: text('identificador').notNull(),
  value: text('valor').notNull(),
  expiresAt: timestamp('expira_en').notNull(),
  createdAt: timestamp('creado_en').notNull().defaultNow(),
})

// Tablas de dominio
export const problemas = mysqlTable('problemas', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  titulo: text('titulo').notNull(),
  descripcion: text('descripcion').notNull(),
  dificultad: text('dificultad').notNull(),
  lenguajesPermitidos: json('lenguajes_permitidos').$type<string[]>().notNull(),
  orden: int('orden').notNull().default(0),
})

export const casosPrueba = mysqlTable('casos_prueba', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  problemaId: text('problema_id')
    .notNull()
    .references(() => problemas.id, { onDelete: 'cascade' }),
  entrada: text('entrada').notNull(),
  salidaEsperada: text('salida_esperada').notNull(),
})

export const envios = mysqlTable('envios', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  usuarioId: text('usuario_id')
    .notNull()
    .references(() => usuarios.id),
  problemaId: text('problema_id')
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
  comentarioClaude: text('comentario_claude'),
  creadoEn: timestamp('creado_en').notNull().defaultNow(),
})

export const preguntasIa = mysqlTable('preguntas_ia', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  usuarioId: text('usuario_id')
    .notNull()
    .references(() => usuarios.id),
  problemaId: text('problema_id').references(() => problemas.id),
  pregunta: text('pregunta').notNull(),
  respuesta: text('respuesta').notNull(),
  creadoEn: timestamp('creado_en').notNull().defaultNow(),
})

export const estadoTorneo = mysqlTable('estado_torneo', {
  id: int('id').primaryKey().default(1),
  iniciadoEn: timestamp('iniciado_en'),
})
