/** Marca de sello del panel de admin: disco con anillo rojo, borde interior
 * dorado y centro azul — referencia la estructura de anillos concéntricos
 * del sello institucional sin reproducir el escudo real. Reemplaza el logo
 * dorado en degradado del navbar de participante. */
export function AdminSealMark({
  className = 'h-8 w-8',
}: {
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full border-2 border-admin-red shadow-[inset_0_0_0_1.5px_var(--color-admin-gold)] ${className}`}
      style={{
        background:
          'radial-gradient(circle at 50% 50%, var(--color-admin-navy) 0 44%, transparent 45%), var(--color-admin-gold)',
      }}
    />
  )
}
