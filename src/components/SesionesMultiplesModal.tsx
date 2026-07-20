import { useQueryClient } from '@tanstack/react-query'
import { cerrarMisOtrasSesiones } from '#/server/functions/sesiones'
import { useModalA11y } from '#/components/useModalA11y'
import { useToastMutation } from '#/components/useToastMutation'
import { LoadingButton } from '#/components/LoadingButton'

export function SesionesMultiplesModal({
  sesionesActivas,
}: {
  sesionesActivas: number
}) {
  const queryClient = useQueryClient()
  // Sin cierre por Escape ni click afuera: la única salida es cerrar las
  // otras sesiones, para que nadie pueda seguir resolviendo con la cuenta
  // abierta en otro dispositivo.
  const modalRef = useModalA11y({ closeOnEscape: false })

  const cerrar = useToastMutation({
    mutationFn: () => cerrarMisOtrasSesiones(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['misSesionesActivas'] }),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sesiones-multiples-titulo"
        className="w-96 rounded bg-white p-4"
      >
        <h2
          id="sesiones-multiples-titulo"
          className="text-lg font-bold text-red-600"
        >
          ⚠️ Tienes más de una sesión abierta
        </h2>
        <p className="mt-2 text-sm text-gray-700">
          Tu cuenta tiene {sesionesActivas} sesiones activas. Para continuar
          resolviendo problemas debes cerrar las sesiones abiertas en otros
          dispositivos.
        </p>
        <LoadingButton
          className="mt-4 w-full rounded bg-red-600 px-4 py-2 text-white disabled:bg-red-300"
          onClick={() => cerrar.mutate()}
          isPending={cerrar.isPending}
          label="Cerrar sesiones en otros dispositivos"
          pendingLabel="Cerrando sesiones..."
        />
      </div>
    </div>
  )
}
