/** Grupo de botones tipo "pill" donde solo una opción está activa a la vez.
 * Solo se usa en vistas de admin — colores de la identidad "sello UMG". */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { valor: T; etiqueta: string }[]
  value: T
  onChange: (valor: T) => void
}) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          className={
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors ' +
            (value === o.valor
              ? 'bg-admin-navy text-white'
              : 'bg-admin-paper-soft text-admin-ink-soft hover:bg-admin-line/30')
          }
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}
