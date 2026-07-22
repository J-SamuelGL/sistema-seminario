import type { ReactNode } from 'react'

/** Marco decorativo con esquinas tipo "objetivo": firma visual de CodeFest
 * 2026, reutilizada en el emblema del hero y en el panel del editor. */
export function CornerFrame({
  children,
  className = '',
  borderClassName = 'border-gold-soft',
}: {
  children: ReactNode
  className?: string
  borderClassName?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <span
        className={`absolute -top-px -left-px z-10 h-4 w-4 border-t-2 border-l-2 ${borderClassName}`}
      />
      <span
        className={`absolute -top-px -right-px z-10 h-4 w-4 border-t-2 border-r-2 ${borderClassName}`}
      />
      <span
        className={`absolute -bottom-px -left-px z-10 h-4 w-4 border-b-2 border-l-2 ${borderClassName}`}
      />
      <span
        className={`absolute -bottom-px -right-px z-10 h-4 w-4 border-b-2 border-r-2 ${borderClassName}`}
      />
      {children}
    </div>
  )
}
