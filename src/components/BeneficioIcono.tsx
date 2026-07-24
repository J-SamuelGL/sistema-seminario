import type { ClaveBeneficio } from '#/shared/beneficios'
import { rutaIconoBeneficio } from '#/shared/beneficios'

const DIMENSIONES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-10 w-10',
  md: 'h-48 w-48',
  lg: 'h-40 w-40',
}

/** Ilustración tipo "objeto obtenido" de una ventaja/desventaja. Decorativa
 * (`alt=""`): el texto del beneficio ya está siempre presente junto al
 * ícono, así que un lector de pantalla no necesita repetirlo. Devuelve
 * `null` si la clave todavía no tiene arte (ver `rutaIconoBeneficio`) — el
 * llamador no necesita reservarle espacio. */
export function BeneficioIcono({
  clave,
  size = 'sm',
}: {
  clave: ClaveBeneficio
  size?: 'sm' | 'md' | 'lg'
}) {
  const ruta = rutaIconoBeneficio(clave)
  if (!ruta) return null

  return (
    <img
      src={ruta}
      alt=""
      className={`${DIMENSIONES[size]} shrink-0 rounded-sm border border-brass-1/50 object-cover shadow-[0_0_10px_color-mix(in_oklch,var(--color-brass-1)_25%,transparent)]`}
    />
  )
}
