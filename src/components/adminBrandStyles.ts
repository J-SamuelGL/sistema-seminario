/** Clases Tailwind compartidas de la identidad "sello UMG" — vistas de
 * *administración* únicamente (panel neutro, sin pergamino/dorado/laurel).
 * Ver los tokens de color/fuente en `@theme` de `src/styles.css`. Nunca
 * importar esto desde una ruta bajo `src/routes/_app/**` — esas mantienen
 * `brandStyles.ts` ("CodeFest 2026"). */

export const ADMIN_TITLE = 'font-admin-display font-bold text-admin-ink'

export const ADMIN_CARD =
  'rounded-md border border-admin-line/60 bg-admin-paper-raised shadow-md shadow-black/5'

export const ADMIN_CARD_ACCENTED = `${ADMIN_CARD} border-t-[3px] border-t-admin-navy`

export const ADMIN_BUTTON_PRIMARY =
  'cursor-pointer rounded-md border border-transparent bg-admin-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-admin-navy-strong disabled:cursor-not-allowed disabled:opacity-50'

export const ADMIN_BUTTON_SECONDARY =
  'cursor-pointer rounded-md border border-admin-line-strong bg-admin-paper-raised px-4 py-2 text-sm font-medium text-admin-ink-soft transition hover:border-admin-navy hover:text-admin-navy disabled:cursor-not-allowed disabled:opacity-50'

export const ADMIN_BUTTON_DANGER =
  'cursor-pointer rounded-md border border-transparent bg-admin-red px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'

export const ADMIN_INPUT_BASE =
  'w-full rounded-md border border-admin-line-strong bg-admin-paper px-3.5 py-2.5 text-[14.5px] text-admin-ink outline-none focus:border-admin-navy focus:ring-[3px] focus:ring-admin-navy/15'

export const ADMIN_LABEL_BASE =
  'text-[11px] font-bold tracking-wide text-admin-ink-faint uppercase'

export const ADMIN_NAV_LINK_BASE =
  'border-b-2 border-transparent py-2 text-[13px] font-medium transition-colors'
export const ADMIN_NAV_LINK_ACTIVE =
  'border-admin-navy text-admin-navy font-semibold'
export const ADMIN_NAV_LINK_INACTIVE =
  'text-admin-ink-soft hover:text-admin-navy'

export const ADMIN_LINK = 'text-admin-navy underline-offset-2 hover:underline'

/** Bloque "nombre + cerrar sesión" del UserMenu de la navbar admin — mismo
 * tratamiento tenue-hasta-el-hover que ADMIN_NAV_LINK_INACTIVE. */
export const ADMIN_NAV_USER_NAME = 'text-sm text-admin-ink-soft'
export const ADMIN_NAV_LOGOUT =
  'text-sm font-medium text-admin-ink-soft transition-colors hover:text-admin-red'

export const ADMIN_TEXTAREA_BASE = `${ADMIN_INPUT_BASE} min-h-24 resize-y font-mono text-[13.5px]`

/** Fondo del filete de tres franjas (rojo/oro/azul del sello) — ver AdminRingStripe. */
export const ADMIN_RING_STRIPE_BACKGROUND =
  'linear-gradient(to right, var(--color-admin-red) 0%, var(--color-admin-red) 33.33%, var(--color-admin-gold) 33.33%, var(--color-admin-gold) 66.66%, var(--color-admin-navy) 66.66%, var(--color-admin-navy) 100%)'
