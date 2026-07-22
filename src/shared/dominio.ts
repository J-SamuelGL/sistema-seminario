// Fuente única de verdad para los enums de dominio. Vive en `src/shared` porque
// las mismas listas alimentan tres consumidores que antes las repetían a mano y
// podían divergir: el esquema de la base (`mysqlEnum` en `db/schema.ts`), la
// validación con Zod (`z.enum(...)`) y los componentes de formulario del cliente.
// Son arrays puros (`as const`) sin dependencias, así que pueden importarse tanto
// desde el servidor como desde el bundle del navegador.

export const ROLES = ['participante', 'admin'] as const
export type Rol = (typeof ROLES)[number]

export const CATEGORIAS = ['invitado', 'junior', 'senior'] as const
export type Categoria = (typeof CATEGORIAS)[number]

export const SEMESTRES = [
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
] as const
export type Semestre = (typeof SEMESTRES)[number]

export const DIFICULTADES = ['Fácil', 'Intermedio', 'Difícil'] as const
export type Dificultad = (typeof DIFICULTADES)[number]

export const CATEGORIAS_PROBLEMA = ['debugging', 'normal'] as const
export type CategoriaProblema = (typeof CATEGORIAS_PROBLEMA)[number]

export const GRUPOS = ['invitado_junior', 'senior'] as const
export type Grupo = (typeof GRUPOS)[number]

export const LENGUAJES = [
  'python',
  'javascript',
  'java',
  'csharp',
  'php',
] as const
export type Lenguaje = (typeof LENGUAJES)[number]

export const TIPOS_ESCALAR = ['int', 'float', 'bool', 'string'] as const
export type TipoEscalar = (typeof TIPOS_ESCALAR)[number]

export const TIPOS_DATO = [
  'int',
  'float',
  'bool',
  'string',
  'list<int>',
  'list<float>',
  'list<bool>',
  'list<string>',
] as const
export type TipoDato = (typeof TIPOS_DATO)[number]

// Veredicto de una corrida ya ejecutada (sin `pendiente`).
export const VEREDICTOS = [
  'aceptado',
  'respuesta_incorrecta',
  'error_ejecucion',
  'tiempo_excedido',
] as const
export type Veredicto = (typeof VEREDICTOS)[number]

// Estado persistido de un envío/corrida: incluye `pendiente` (aún sin ejecutar).
export const ESTADOS_ENVIO = ['pendiente', ...VEREDICTOS] as const
export type EstadoEnvio = (typeof ESTADOS_ENVIO)[number]

export const ESTADOS_PROGRESO = [
  'pendiente',
  'completado',
  'aprobado_manual',
] as const
export type EstadoProgreso = (typeof ESTADOS_PROGRESO)[number]

/**
 * Convierte el `categoria: string` que expone Better Auth (sus `additionalFields`
 * no soportan uniones de literales) a la `Categoria` tipada, validando en runtime.
 * Centraliza el cast que antes se repetía como `as 'invitado' | 'junior' | 'senior'`.
 */
export function aCategoria(valor: string): Categoria {
  if ((CATEGORIAS as readonly string[]).includes(valor)) {
    return valor as Categoria
  }
  throw new Error(`Categoría inválida: ${valor}`)
}
