/** Grupo de botones tipo "pill" donde solo una opción está activa a la vez. */
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
            'rounded-full px-4 py-1.5 text-sm font-medium ' +
            (value === o.valor
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
          }
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}
