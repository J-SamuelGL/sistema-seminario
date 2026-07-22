/** Clases Tailwind compartidas de la identidad visual "CodeFest 2026"
 * (vistas de participante). Ver los tokens de color/fuente en `@theme` de
 * `src/styles.css`. */

export const GRADIENT_TEXT =
  'bg-gradient-to-br from-laurel-deep to-laurel bg-clip-text text-transparent'

export const CARD =
  'rounded-md border border-line/40 bg-paper shadow-xl shadow-black/5'

export const BUTTON_PRIMARY =
  'rounded-sm border-x-0 border-y border-brass-1 bg-laurel-deep px-4 py-2.5 font-display text-[15px] font-semibold tracking-wide text-brass-1 [font-variant-caps:small-caps] shadow-[0_6px_14px_-6px_rgba(0,0,0,0.35)] transition hover:bg-[oklch(22%_0.02_150)] hover:shadow-[0_6px_14px_-6px_rgba(0,0,0,0.35),0_0_0_8px_color-mix(in_oklch,var(--color-brass-1)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-50'

export const INPUT_BASE =
  'w-full rounded-sm border border-line/70 bg-paper-soft px-3.5 py-2.5 text-[14.5px] text-ink outline-none focus:border-laurel focus:ring-[3px] focus:ring-laurel/15'

export const LABEL_BASE =
  'text-[13px] font-semibold tracking-wide text-gold-label [font-variant-caps:small-caps]'

export const NAV_LINK_BASE =
  'relative isolate border-b-2 border-transparent py-2 font-display text-[13.5px] font-semibold tracking-wide uppercase transition-colors ' +
  'before:content-[""] before:absolute before:-inset-x-[22px] before:-inset-y-2 before:-z-10 before:rounded-sm ' +
  'before:bg-[radial-gradient(ellipse_70%_100%_at_50%_50%,color-mix(in_oklch,var(--color-gold)_55%,transparent)_0%,color-mix(in_oklch,var(--color-brass-1)_25%,transparent)_45%,transparent_75%)] ' +
  'before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100'

/** Geometría del filete inferior que se desvanece en los bordes (el ::after de
 * cada link). Vive en ACTIVE/INACTIVE, no en NAV_LINK_BASE, porque cada uno le
 * da una opacidad distinta y sin variantes en conflicto (activo: siempre
 * visible; inactivo: solo en hover). */
const NAV_LINK_UNDERLINE =
  'after:content-[""] after:absolute after:-inset-x-[22px] after:bottom-[-1px] after:h-px after:-z-10 ' +
  'after:bg-[linear-gradient(to_right,transparent,color-mix(in_oklch,var(--color-gold)_60%,transparent),transparent)] ' +
  'after:transition-opacity after:duration-300'

export const NAV_LINK_ACTIVE = `border-gold text-gold-strong ${NAV_LINK_UNDERLINE} after:opacity-100`
export const NAV_LINK_INACTIVE = `text-ink-faint hover:text-gold-dark ${NAV_LINK_UNDERLINE} after:opacity-0 hover:after:opacity-100`
/** Triangulito bajo el tab activo — se agrega como hijo del link (::before/::after
 * del propio link ya están tomados por el glow y el filete de hover). */
export const NAV_LINK_CARET =
  'pointer-events-none absolute left-1/2 bottom-[-9px] h-0 w-0 -translate-x-1/2 border-x-[4px] border-x-transparent border-t-[4px] border-t-gold-strong'

export const PILL_BASE =
  'inline-block rounded-sm px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase'

export const DIFICULTAD_PILL: Record<string, string> = {
  Fácil: 'bg-laurel-soft text-laurel-ink',
  Intermedio: 'bg-amber-soft text-amber-ink',
  Difícil: 'bg-char text-char-ink',
}

export const OUTLINE_PILL =
  'inline-block rounded-sm border border-line px-2.5 py-1 text-[11px] font-bold tracking-wide text-ink-faint uppercase'

export const BUTTON_SECONDARY =
  'rounded-sm border border-line bg-paper px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-gold-soft hover:bg-paper-soft hover:text-gold-dark hover:shadow-[0_0_0_6px_color-mix(in_oklch,var(--color-brass-1)_16%,transparent)] disabled:cursor-not-allowed disabled:opacity-50'

export const BUTTON_DANGER =
  'rounded-sm border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50'

export const LINK =
  'text-gold underline-offset-2 hover:text-gold-dark hover:underline'

export const TEXTAREA_BASE = `${INPUT_BASE} min-h-24 resize-y font-mono text-[13.5px]`
