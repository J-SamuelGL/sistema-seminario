import { useMutation } from '@tanstack/react-query'
import type { UseMutationOptions } from '@tanstack/react-query'
import { toast } from 'sonner'

/**
 * Envoltorio de `useMutation` que por defecto muestra un toast de error con
 * `err.message` (patrón repetido en cada `onError` del proyecto). Si se pasa
 * un `onError` propio, se ejecuta además del toast por defecto.
 */
export function useToastMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(options: UseMutationOptions<TData, TError, TVariables, TContext>) {
  const { onError, ...resto } = options
  return useMutation({
    ...resto,
    onError: (...args: Parameters<NonNullable<typeof onError>>) => {
      const [err] = args
      toast.error(err instanceof Error ? err.message : String(err))
      onError?.(...args)
    },
  })
}
