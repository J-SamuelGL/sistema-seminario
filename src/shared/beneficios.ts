// Catálogo de "ventajas" (invitado/junior) y "desventajas" (senior) del
// torneo. La aplicación real ocurre fuera del sistema; esto solo define qué
// se puede asignar y qué tipo de objetivo pide cada ítem al registrarlo.
// Ver docs/superpowers/specs/2026-07-23-ventajas-desventajas-design.md.

export const CLAVES_VENTAJA = [
  'busqueda_google',
  'ver_codigo',
  'borrar_codigo',
  'consultar_ingeniero',
  'nada',
  'cupon_premio',
  'prompt_ia',
] as const

export const CLAVES_DESVENTAJA = [
  'salir_caminar',
  'reiniciar_compu',
  'poner_cancion',
  'voltear_pantalla',
  'atar_mano',
  'letra_chiquita',
] as const

export const CLAVES_BENEFICIO = [
  ...CLAVES_VENTAJA,
  ...CLAVES_DESVENTAJA,
] as const
export type ClaveBeneficio = (typeof CLAVES_BENEFICIO)[number]

export const TIPOS_OBJETIVO = ['ninguno', 'participante', 'ingeniero'] as const
export type TipoObjetivo = (typeof TIPOS_OBJETIVO)[number]

export const CATALOGO_BENEFICIOS: Record<
  ClaveBeneficio,
  { texto: string; pool: 'ventaja' | 'desventaja'; tipoObjetivo: TipoObjetivo }
> = {
  busqueda_google: {
    texto: 'Una búsqueda en Google',
    pool: 'ventaja',
    tipoObjetivo: 'ninguno',
  },
  ver_codigo: {
    texto: 'Ver el código de alguien más a su elección (solo un minuto)',
    pool: 'ventaja',
    tipoObjetivo: 'participante',
  },
  borrar_codigo: {
    texto:
      'Borrar una porción del código de alguien más (una línea máximo o modificar una palabra máximo)',
    pool: 'ventaja',
    tipoObjetivo: 'participante',
  },
  consultar_ingeniero: {
    texto: 'Consultar a un ingeniero (minuto y medio)',
    pool: 'ventaja',
    tipoObjetivo: 'ingeniero',
  },
  nada: {
    texto: 'Nada',
    pool: 'ventaja',
    tipoObjetivo: 'ninguno',
  },
  cupon_premio: {
    texto: 'Cupón o premio inmediato',
    pool: 'ventaja',
    tipoObjetivo: 'ninguno',
  },
  prompt_ia: {
    texto: 'Un prompt a una IA (solo un minuto para escribirlo y leerlo)',
    pool: 'ventaja',
    tipoObjetivo: 'ninguno',
  },
  salir_caminar: {
    texto: 'Salir a dar una vuelta',
    pool: 'desventaja',
    tipoObjetivo: 'participante',
  },
  reiniciar_compu: {
    texto: 'Reiniciar la compu de alguien más',
    pool: 'desventaja',
    tipoObjetivo: 'participante',
  },
  poner_cancion: {
    texto: 'Ponerle una canción a alguien (máximo 5 minutos de largo)',
    pool: 'desventaja',
    tipoObjetivo: 'participante',
  },
  voltear_pantalla: {
    texto: 'Voltearle la pantalla a alguien más (5 minutos)',
    pool: 'desventaja',
    tipoObjetivo: 'participante',
  },
  atar_mano: {
    texto: 'Atarle la mano dominante a alguien (5 minutos)',
    pool: 'desventaja',
    tipoObjetivo: 'participante',
  },
  letra_chiquita: {
    texto: 'Hacer chiquita la letra del IDE de alguien (5 minutos)',
    pool: 'desventaja',
    tipoObjetivo: 'participante',
  },
}

// Placeholder intencional — reemplazar con los nombres reales antes del
// torneo. No hay tabla ni pantalla de administración para esto (decisión
// explícita del spec): es un array que se edita en código.
export const INGENIEROS = ['Ingeniero 1', 'Ingeniero 2'] as const
export type Ingeniero = (typeof INGENIEROS)[number]
