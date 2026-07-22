import { ADMIN_RING_STRIPE_BACKGROUND } from '#/components/adminBrandStyles'

/** Firma visual del panel de admin: filete de 3px en tercios rojo/oro/azul
 * (los colores del sello, aplanados). Aparece una sola vez por pantalla, en
 * el borde superior del navbar — nunca dentro del contenido. */
export function AdminRingStripe() {
  return (
    <div
      className="h-[3px] w-full shrink-0"
      style={{ background: ADMIN_RING_STRIPE_BACKGROUND }}
    />
  )
}
