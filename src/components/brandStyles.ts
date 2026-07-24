/** Clases Tailwind compartidas de la identidad visual "CodeFest 2026"
 * (vistas de participante). Ver los tokens de color/fuente en `@theme` de
 * `src/styles.css`. */

/** Degradado horizontal, de casi negro (--color-ink) a la izquierda a verde
 * (--color-laurel) a la derecha. `inline-block` es necesario: sin él, el
 * degradado se pinta sobre el ancho completo del contenedor (h1/h2 son
 * block), no sobre el ancho real del texto, así que en títulos cortos el
 * tramo verde queda fuera de las letras y no se ve. */
export const GRADIENT_TEXT =
  'inline-block bg-[linear-gradient(90deg,var(--color-ink)_10%,var(--color-laurel)_90%)] bg-clip-text text-transparent'

/** Resaltado verde direccional (izquierda→derecha, se desvanece antes de
 * llegar al borde) que comparten la lista de problemas, el panel de
 * problema y la tabla de clasificación — un solo lenguaje visual de "fila
 * activa" en vez de tratamientos distintos por vista.
 *
 * Cada clase de abajo está escrita como un literal completo (no armada con
 * `${...}` a partir de fragmentos) porque el scanner de Tailwind busca
 * tokens de utilidad completos en el texto fuente tal cual — una clase
 * partida por una interpolación de plantilla nunca se detecta y su CSS no
 * se genera. */

/** Fila de lista clickeable: barra de acento + degradado verde en hover.
 * Requiere `group` en el propio elemento (ya incluido). */
export const ROW_INTERACTIVE =
  'group flex items-center gap-4 border-l-[3px] border-transparent px-5 py-3.5 transition-colors ' +
  'hover:border-l-laurel hover:bg-[linear-gradient(90deg,color-mix(in_oklch,var(--color-laurel-soft)_75%,transparent)_0%,transparent_62%)]'

/** Marcador (rombo/ícono) de una fila con ROW_INTERACTIVE: pasa de
 * ink-faint a laurel-ink junto con el hover de la fila. */
export const ROW_MARKER_INTERACTIVE =
  'text-ink-faint transition-colors group-hover:text-laurel-ink'

/** Título de una fila con ROW_INTERACTIVE: adopta el mismo degradado de
 * texto que GRADIENT_TEXT, pero solo al pasar el mouse. Sin `transition-colors`
 * a propósito: `background-clip: text` no es animable, así que si `color`
 * transiciona de ink a transparent mientras el clip ya cambió, hay un frame
 * intermedio donde el navegador mezcla el color aún opaco con el degradado
 * de fondo y el texto destella en blanco. El cambio debe ser instantáneo. */
export const ROW_TITLE_HOVER_GRADIENT =
  'group-hover:bg-clip-text group-hover:text-transparent ' +
  'group-hover:bg-[linear-gradient(90deg,var(--color-ink)_10%,var(--color-laurel)_90%)]'

/** Fondo de una fila ya "activa" sin necesidad de hover (p.ej. la fila del
 * usuario actual en la tabla de clasificación), con el mismo degradado que
 * ROW_INTERACTIVE usa en hover. */
export const ROW_ACTIVE_GRADIENT =
  'bg-[linear-gradient(90deg,color-mix(in_oklch,var(--color-laurel-soft)_90%,transparent)_0%,transparent_80%)]'

export const CARD =
  'rounded-md border border-line/40 bg-paper shadow-xl shadow-black/5'

/** El resplandor difuminado del hover (en vez de un anillo de borde duro) es
 * el mismo lenguaje de "foco" tipo Elden Ring que ya usan BUTTON_TERMINAL_*
 * y NAV_LOGOUT — un halo cálido que se desvanece hacia afuera, no un borde
 * extra nítido. */
export const BUTTON_PRIMARY =
  'cursor-pointer rounded-sm border-x-0 border-y border-brass-1 bg-laurel-deep px-4 py-2.5 font-display text-[15px] font-semibold tracking-wide text-brass-1 [font-variant-caps:small-caps] shadow-[0_6px_14px_-6px_rgba(0,0,0,0.35)] transition hover:bg-[oklch(22%_0.02_150)] hover:shadow-[0_6px_14px_-6px_rgba(0,0,0,0.35),0_0_20px_4px_color-mix(in_oklch,var(--color-brass-1)_45%,transparent)] disabled:cursor-not-allowed disabled:opacity-50'

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

/** Bloque "nombre + cerrar sesión" del UserMenu de la navbar de participante.
 * Mismo lenguaje ceremonial que LOGRO_TEXT_NEUTRO (p.ej. "✦ Problema X de N ✦"),
 * al mismo tamaño en el que ese badge se usa en la barra de navegación del
 * detalle de problema. */
export const NAV_USER_NAME =
  'font-display text-[11px] font-bold tracking-[0.16em] text-gold-strong uppercase [font-variant-caps:small-caps] whitespace-nowrap [text-shadow:0_0_10px_color-mix(in_oklch,var(--color-gold)_55%,transparent)]'

/** "Cerrar sesión" como cajita oscura con resplandor, mismo lenguaje visual
 * que BUTTON_TERMINAL_RUN/BUTTON_TERMINAL_ASSIST (editor de código), en tono
 * rojo para marcarla como la acción destructiva/de salida. Tamaño reducido
 * porque vive en la navbar, no en la barra del editor. */
export const NAV_LOGOUT =
  'cursor-pointer rounded-sm border border-[oklch(55%_0.16_25/0.6)] bg-[oklch(16%_0.03_25)] px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide text-[oklch(78%_0.16_25)] uppercase shadow-[0_0_12px_oklch(55%_0.16_25/0.25)] transition hover:shadow-[0_0_18px_oklch(55%_0.16_25/0.45)]'
/** Triangulito bajo el tab activo — se agrega como hijo del link (::before/::after
 * del propio link ya están tomados por el glow y el filete de hover). */
export const NAV_LINK_CARET =
  'pointer-events-none absolute left-1/2 bottom-[-9px] h-0 w-0 -translate-x-1/2 border-x-[4px] border-x-transparent border-t-[4px] border-t-gold-strong'

export const PILL_BASE =
  'inline-block rounded-sm px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase'

/** Clases completas (no combinadas con PILL_BASE): mismo lenguaje "caja
 * oscura + borde de color + resplandor" que BUTTON_TERMINAL_RUN/ASSIST,
 * reusando el mismo mapeo de tono (ámbar=Intermedio, verde=Fácil) más rojo
 * para Difícil (más difícil → tono de alerta, como NAV_LOGOUT). */
export const DIFICULTAD_PILL: Record<string, string> = {
  Fácil:
    'inline-block rounded-sm border border-[oklch(55%_0.12_152/0.6)] bg-[oklch(16%_0.03_152)] px-2.5 py-1 font-display text-[11px] font-bold tracking-wide text-[oklch(78%_0.14_152)] uppercase shadow-[0_0_10px_oklch(55%_0.14_152/0.3)]',
  Intermedio:
    'inline-block rounded-sm border border-[oklch(55%_0.15_70/0.6)] bg-[oklch(16%_0.03_70)] px-2.5 py-1 font-display text-[11px] font-bold tracking-wide text-[oklch(78%_0.16_70)] uppercase shadow-[0_0_10px_oklch(55%_0.16_70/0.3)]',
  Difícil:
    'inline-block rounded-sm border border-[oklch(55%_0.16_25/0.6)] bg-[oklch(16%_0.03_25)] px-2.5 py-1 font-display text-[11px] font-bold tracking-wide text-[oklch(78%_0.16_25)] uppercase shadow-[0_0_10px_oklch(55%_0.16_25/0.3)]',
}

export const OUTLINE_PILL =
  'inline-block rounded-sm border border-line px-2.5 py-1 text-[11px] font-bold tracking-wide text-ink-faint uppercase'

/** Badge de categoría del problema ("Debugging", etc.) en el mismo estilo
 * terminal, tono brass/dorado neutro (no tiene una semántica de éxito/riesgo
 * como la dificultad). */
export const CATEGORIA_PILL_TERMINAL =
  'inline-block rounded-sm border border-brass-1/60 bg-[oklch(16%_0.02_82)] px-2.5 py-1 font-display text-[11px] font-bold tracking-wide text-brass-1 uppercase shadow-[0_0_10px_color-mix(in_oklch,var(--color-brass-1)_25%,transparent)]'

/** Badge de "X min" en la fila de un problema resuelto: mismo estilo
 * terminal en verde/laurel (ligado a la señal de éxito, como LOGRO_TEXT). */
export const DURACION_PILL_TERMINAL =
  'inline-block rounded-sm border border-[oklch(55%_0.1_152/0.5)] bg-[oklch(16%_0.03_152)] px-2 py-0.5 font-display text-[10px] font-bold tracking-wide text-[oklch(75%_0.12_152)] uppercase shadow-[0_0_8px_oklch(55%_0.12_152/0.25)]'

/** Franja de KPIs (Resueltos/Faltan/Puntos/Puesto) de la lista de problemas:
 * fondo claro (a diferencia del resto de la identidad "terminal" — el
 * usuario prefirió mantener esta franja clara), pero con borde/etiqueta
 * brass para que no quede totalmente desconectada del resto. PUESTO
 * conserva el fondo ámbar como acento, igual que antes. */
export const KPI_TILE =
  'flex-1 border-r border-line/50 bg-paper-soft px-3.5 py-2 last:border-r-0'
export const KPI_TILE_HIGHLIGHT = 'flex-1 bg-amber-soft px-3.5 py-2'
export const KPI_TILE_LABEL =
  'font-display text-[10px] font-bold tracking-wide text-gold-label uppercase'
export const KPI_TILE_VALUE =
  'font-display text-[15px] font-bold text-ink [font-variant-numeric:tabular-nums]'
export const KPI_TILE_VALUE_HIGHLIGHT =
  'font-display text-[15px] font-bold text-gold-strong [font-variant-numeric:tabular-nums]'

export const BUTTON_SECONDARY =
  'cursor-pointer rounded-sm border border-line bg-paper px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-gold-soft hover:bg-paper-soft hover:text-gold-dark hover:shadow-[0_0_16px_3px_color-mix(in_oklch,var(--color-brass-1)_40%,transparent)] disabled:cursor-not-allowed disabled:opacity-50'

export const BUTTON_DANGER =
  'cursor-pointer rounded-sm border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 hover:shadow-[0_0_16px_3px_rgba(220,38,38,0.35)] disabled:cursor-not-allowed disabled:opacity-50'

export const LINK =
  'text-gold underline-offset-2 hover:text-gold-dark hover:underline'

export const TEXTAREA_BASE = `${INPUT_BASE} min-h-24 resize-y font-mono text-[13.5px]`

/** Texto ceremonial tipo "logro desbloqueado" (inspirado en los avisos de
 * Elden Ring): usado en el aviso de problema resuelto, el badge de
 * check-in y el marcador compacto de la lista de problemas — mismo
 * lenguaje visual en las tres escalas, solo cambia el tamaño de fuente. */
export const LOGRO_TEXT =
  'font-display font-bold tracking-[0.16em] text-laurel-ink uppercase [font-variant-caps:small-caps] [text-shadow:0_0_10px_color-mix(in_oklch,var(--color-laurel)_55%,transparent)]'

/** Misma familia ceremonial que LOGRO_TEXT, pero en dorado en vez de verde
 * — para texto informativo/neutro (p.ej. "Problema X de N") donde el verde
 * de LOGRO_TEXT se leería como una señal de logro/éxito que no aplica. */
export const LOGRO_TEXT_NEUTRO =
  'font-display font-bold tracking-[0.16em] text-gold-strong uppercase [font-variant-caps:small-caps] [text-shadow:0_0_10px_color-mix(in_oklch,var(--color-gold)_55%,transparent)]'

/** Filete dorado-verde que enmarca el texto ceremonial arriba/abajo, en el
 * mismo espíritu que BrandDivider pero sin el rombo central. */
export const LOGRO_LINE =
  'h-px bg-gradient-to-r from-transparent via-laurel to-transparent'

/** Contraparte de LOGRO_LINE para acompañar a LOGRO_TEXT_NEUTRO (dorado en
 * vez de verde). */
export const LOGRO_LINE_NEUTRO =
  'h-px bg-gradient-to-r from-transparent via-gold to-transparent'

/** Como LOGRO_TEXT_NEUTRO pero en el amarillo/brass brillante que ya usan
 * BUTTON_TERMINAL_NAV/NAV_ARROW_BUTTON para leerse sobre fondo oscuro
 * (`char`) — el dorado apagado de LOGRO_TEXT_NEUTRO está pensado para papel
 * claro y se ve deslucido sobre negro. */
export const LOGRO_TEXT_NEUTRO_OSCURO =
  'font-display font-bold tracking-[0.16em] text-brass-1 uppercase [font-variant-caps:small-caps] [text-shadow:0_0_10px_color-mix(in_oklch,var(--color-brass-1)_55%,transparent)]'

/** Mismo lenguaje ceremonial que LOGRO_TEXT/LOGRO_LINE (small-caps,
 * resplandor, filete arriba/abajo), pero en los tonos brillantes de la
 * familia "terminal" (BUTTON_TERMINAL_RUN/ASSIST, DIFICULTAD_PILL) en vez de
 * laurel-ink/gold-strong: laurel-ink es un verde oscuro pensado para texto
 * sobre papel claro, e ilegible sobre el fondo casi negro del panel de
 * resultados de Ejecutar — este par (éxito/error) es para ese contexto
 * oscuro específicamente. */
export const LOGRO_TEXT_TERMINAL: Record<'exito' | 'error', string> = {
  exito:
    'font-display font-bold tracking-[0.16em] text-[oklch(78%_0.14_152)] uppercase [font-variant-caps:small-caps] [text-shadow:0_0_10px_oklch(55%_0.16_152/0.5)]',
  error:
    'font-display font-bold tracking-[0.16em] text-[oklch(78%_0.16_25)] uppercase [font-variant-caps:small-caps] [text-shadow:0_0_10px_oklch(55%_0.16_25/0.5)]',
}
export const LOGRO_LINE_TERMINAL: Record<'exito' | 'error', string> = {
  exito:
    'h-px bg-gradient-to-r from-transparent via-[oklch(55%_0.16_152)] to-transparent',
  error:
    'h-px bg-gradient-to-r from-transparent via-[oklch(55%_0.16_25)] to-transparent',
}

/** Botones de la barra del editor de código (fondo tipo terminal oscura):
 * ámbar para la acción principal (Ejecutar), verde para el asistente de IA.
 * Deliberadamente distintos de BUTTON_PRIMARY (usado por acciones de
 * cuenta/sesión como "Iniciar sesión") para que no parezcan la misma
 * acción; ambos declaran `cursor-pointer` porque el preflight de Tailwind
 * resetea el cursor de los `<button>` a `default`. */
export const BUTTON_TERMINAL_RUN =
  'cursor-pointer rounded-sm border border-[oklch(55%_0.15_70/0.6)] bg-[oklch(16%_0.03_70)] px-4 py-2 font-display text-[13px] font-semibold tracking-wide text-[oklch(78%_0.16_70)] uppercase shadow-[0_0_20px_2px_oklch(55%_0.18_70/0.4)] transition hover:shadow-[0_0_30px_6px_oklch(55%_0.2_70/0.6)] disabled:cursor-not-allowed disabled:opacity-50'

export const BUTTON_TERMINAL_ASSIST =
  'cursor-pointer rounded-sm border border-[oklch(55%_0.12_152/0.6)] bg-[oklch(16%_0.03_152)] px-4 py-2 font-display text-[13px] font-semibold tracking-wide text-[oklch(78%_0.14_152)] uppercase shadow-[0_0_20px_2px_oklch(55%_0.16_152/0.4)] transition hover:shadow-[0_0_30px_6px_oklch(55%_0.18_152/0.6)]'

/** Flechas de navegación anterior/siguiente del detalle de problema: misma
 * caja oscura + borde brass + resplandor ambiental que BUTTON_TERMINAL_RUN
 * ("estilo Elden Ring"), en vez del cuadrito de borde plano de antes. */
export const NAV_ARROW_BUTTON =
  'cursor-pointer rounded-sm border border-brass-1/60 bg-[oklch(28%_0.03_82)] px-3 py-1.5 text-lg text-brass-1 shadow-[0_0_8px_color-mix(in_oklch,var(--color-brass-1)_12%,transparent)] transition hover:border-brass-1 hover:text-gold-strong hover:shadow-[0_0_14px_2px_color-mix(in_oklch,var(--color-brass-1)_25%,transparent)]'

/** Link "volver a la lista de problemas": misma familia que NAV_ARROW_BUTTON
 * pero con texto en vez de solo un ícono — más intuitivo que un glifo de
 * lista genérico. Vive arriba del título del problema, no en la fila de
 * navegación anterior/siguiente. */
export const BUTTON_TERMINAL_NAV =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-brass-1/60 bg-[oklch(28%_0.03_82)] px-3 py-1.5 font-display text-[12px] font-semibold tracking-wide text-brass-1 uppercase shadow-[0_0_8px_color-mix(in_oklch,var(--color-brass-1)_12%,transparent)] transition hover:border-brass-1 hover:text-[oklch(90%_0.08_85)] hover:shadow-[0_0_22px_5px_color-mix(in_oklch,var(--color-brass-1)_45%,transparent)]'

/** Tarjeta clara para los paneles del tablero público de clasificación —
 * mismo lenguaje que CARD (pergamino/dorado del resto de la identidad de
 * participante), como contenedor de panel. */
export const CARD_TABLERO =
  'rounded-md border border-line/40 bg-paper shadow-xl shadow-black/5'

/** Título de panel dentro de CARD_TABLERO: small-caps ceremonial en dorado,
 * misma familia que KPI_TILE_LABEL/LABEL_BASE. */
export const PANEL_TITLE_TABLERO =
  'font-display text-[13px] font-bold tracking-[0.14em] text-gold-label uppercase [font-variant-caps:small-caps]'

/** Filete bajo el título de un panel del tablero (ver `PanelTablero`) — el
 * mismo lenguaje de "regla dorada" que separa secciones en otras vistas
 * ceremoniales, aplicado acá para darle más peso al encabezado. */
export const PANEL_TITLE_RULE_TABLERO =
  'mt-1.5 block h-px w-full bg-gradient-to-r from-brass-1/70 via-brass-1/20 to-transparent'

/** Pestañas del selector de categoría del tablero público — una sola activa
 * a la vez (no filtro multi-select), por eso la activa lleva resplandor:
 * es la que decide qué categoría ve todo el tablero, no un simple filtro
 * secundario. */
export const PILL_FILTRO_ACTIVA =
  'cursor-pointer rounded-sm border border-laurel/60 bg-laurel-soft px-4 py-2 font-display text-[12px] font-bold tracking-wide text-laurel-ink uppercase shadow-[0_0_14px_2px_color-mix(in_oklch,var(--color-laurel)_35%,transparent)] transition'

export const PILL_FILTRO_INACTIVA =
  'cursor-pointer rounded-sm border border-line/60 bg-paper-soft px-4 py-2 font-display text-[12px] font-bold tracking-wide text-ink-faint uppercase opacity-60 transition hover:opacity-90'

/** Título de panel del tablero público, versión más dramática: mismo dorado
 * ceremonial que PANEL_TITLE_TABLERO pero más grande y con el resplandor que
 * ya usa LOGRO_TEXT_NEUTRO — sube el peso visual de los seis paneles
 * secundarios sin tocar PANEL_TITLE_TABLERO (que sigue usando LeaderboardTable
 * sin cambios). */
export const PANEL_TITLE_TABLERO_EPICO =
  'font-display text-[16px] font-bold tracking-[0.16em] text-gold-strong uppercase [font-variant-caps:small-caps] [text-shadow:0_0_10px_color-mix(in_oklch,var(--color-gold)_50%,transparent)]'

/** Contraparte roja de LOGRO_TEXT para texto ceremonial de alerta sobre
 * papel claro (p.ej. "Por nadie"): mismo tratamiento (small-caps +
 * resplandor) que LOGRO_TEXT, pero en rojo en vez de laurel. */
export const LOGRO_TEXT_ALERTA =
  'font-display font-bold tracking-[0.16em] text-red-700 uppercase [font-variant-caps:small-caps] [text-shadow:0_0_8px_color-mix(in_oklch,oklch(55%_0.18_25)_45%,transparent)]'

/** Acento de fila estático (no clickeable) para las listas de los paneles
 * del tablero: banda horizontal de borde a borde con desvanecido simétrico
 * (opaca en el centro, se apaga en ambos extremos) + filete arriba/abajo,
 * como la barra de selección de un menú de Elden Ring — no un degradado que
 * arranca de golpe en el borde izquierdo (eso se leía como un corte, no
 * como una fila resaltada). Variantes laurel/ámbar/alerta según el tipo de
 * dato de cada fila. */
export const ROW_ACCENT_LAUREL =
  'border-y border-laurel/20 bg-[linear-gradient(90deg,transparent_0%,color-mix(in_oklch,var(--color-laurel-soft)_65%,transparent)_20%,color-mix(in_oklch,var(--color-laurel-soft)_65%,transparent)_80%,transparent_100%)] py-1.5'
export const ROW_ACCENT_AMBAR =
  'border-y border-brass-1/20 bg-[linear-gradient(90deg,transparent_0%,color-mix(in_oklch,var(--color-amber-soft)_65%,transparent)_20%,color-mix(in_oklch,var(--color-amber-soft)_65%,transparent)_80%,transparent_100%)] py-1.5'
export const ROW_ACCENT_ALERTA =
  'border-y border-red-300/30 bg-[linear-gradient(90deg,transparent_0%,color-mix(in_oklch,oklch(88%_0.06_25)_65%,transparent)_20%,color-mix(in_oklch,oklch(88%_0.06_25)_65%,transparent)_80%,transparent_100%)] py-1.5'
