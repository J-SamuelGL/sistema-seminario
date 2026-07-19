import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from '#/components/Spinner'

/**
 * Botón que alterna entre su texto normal y un estado "cargando" (spinner +
 * texto) según `isPending`, con las clases exactas usadas en todo el proyecto
 * para ese estado.
 */
export function LoadingButton({
  isPending,
  label,
  pendingLabel,
  wrapperClassName = 'flex items-center justify-center gap-2',
  spinnerClassName,
  disabled,
  ...rest
}: {
  isPending: boolean
  label: ReactNode
  pendingLabel: ReactNode
  wrapperClassName?: string
  spinnerClassName?: string
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button disabled={isPending || disabled} {...rest}>
      {isPending ? (
        <span className={wrapperClassName}>
          <Spinner className={spinnerClassName} /> {pendingLabel}
        </span>
      ) : (
        label
      )}
    </button>
  )
}
