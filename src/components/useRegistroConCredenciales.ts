import { useState } from 'react'
import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useToastMutation } from '#/components/useToastMutation'

type ResultadoRegistro = {
  id: string
  correoEnviado: boolean
  contrasenaGenerada: string
}

/**
 * Plomería compartida por `admin/administradores.tsx` y
 * `admin/participantes.tsx`: registrar una cuenta, acumular los resultados
 * (con sus credenciales generadas) en una lista local, y eliminar cuentas con
 * seguimiento de cuál fila está pendiente de borrar.
 */
export function useRegistroConCredenciales<
  TInput,
  TResultado extends ResultadoRegistro,
>({
  crearFn,
  eliminarFn,
  queryClient,
  queryKey,
  mensajeRegistrado,
  mensajeEliminado,
  alRegistrar,
}: {
  crearFn: (input: { data: TInput }) => Promise<TResultado>
  eliminarFn: (input: { data: string }) => Promise<unknown>
  queryClient: QueryClient
  queryKey: QueryKey
  mensajeRegistrado: string
  mensajeEliminado: string
  alRegistrar?: () => void
}) {
  const [registrados, setRegistrados] = useState<TResultado[]>([])

  const crear = useToastMutation({
    mutationFn: (input: TInput) => crearFn({ data: input }),
    onSuccess: (resultado) => {
      setRegistrados((prev) => [resultado, ...prev])
      queryClient.invalidateQueries({ queryKey })
      toast.success(mensajeRegistrado)
      alRegistrar?.()
    },
  })

  const eliminar = useToastMutation({
    mutationFn: (id: string) => eliminarFn({ data: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast.success(mensajeEliminado)
    },
  })

  function actualizarRegistro(id: string, patch: Partial<TResultado>) {
    setRegistrados((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    )
  }

  function estaEliminando(id: string) {
    return eliminar.isPending && eliminar.variables === id
  }

  return {
    registrados,
    crear,
    eliminar,
    actualizarRegistro,
    estaEliminando,
  }
}
