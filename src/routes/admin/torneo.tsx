import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  iniciarTorneo,
  concluirTorneo,
  crearTorneo,
} from '#/server/functions/tournament'
import { estadoTorneoQueryOptions } from '#/server/queries/torneo'
import { LoadingButton } from '#/components/LoadingButton'
import { useToastMutation } from '#/components/useToastMutation'

export const Route = createFileRoute('/admin/torneo')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(estadoTorneoQueryOptions()),
  component: TournamentControlPage,
})

function TournamentControlPage() {
  const queryClient = useQueryClient()
  const { data: estado } = useSuspenseQuery(estadoTorneoQueryOptions())
  const [anio, setAnio] = useState('')

  const crear = useToastMutation({
    mutationFn: (nuevoAnio: number) =>
      crearTorneo({ data: { anio: nuevoAnio } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: estadoTorneoQueryOptions().queryKey,
      })
      toast.success('Torneo creado.')
      setAnio('')
    },
  })

  const iniciar = useToastMutation({
    mutationFn: () => iniciarTorneo(),
    onSuccess: (resultado) => {
      queryClient.setQueryData(estadoTorneoQueryOptions().queryKey, {
        ...estado,
        iniciadoEn: resultado.iniciadoEn,
        finalizadoEn: null,
      })
      toast.success('Torneo iniciado.')
    },
  })

  const concluir = useToastMutation({
    mutationFn: () => concluirTorneo(),
    onSuccess: (resultado) => {
      queryClient.setQueryData(estadoTorneoQueryOptions().queryKey, {
        ...estado,
        finalizadoEn: resultado.finalizadoEn,
      })
      toast.success('Torneo concluido.')
    },
  })

  if (!estado) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold">Control del torneo</h1>
        <p className="mt-2">No hay ningún torneo creado todavía.</p>
        <FormularioCrearTorneo
          anio={anio}
          setAnio={setAnio}
          onSubmit={() => crear.mutate(Number(anio))}
          isPending={crear.isPending}
        />
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Control del torneo {estado.anio}</h1>
      {estado.finalizadoEn ? (
        <div>
          <p>
            Torneo concluido a las{' '}
            {new Date(estado.finalizadoEn).toLocaleTimeString()}
          </p>
          <div className="mt-6 border-t pt-4">
            <h2 className="font-bold">Crear el torneo del siguiente año</h2>
            <FormularioCrearTorneo
              anio={anio}
              setAnio={setAnio}
              onSubmit={() => crear.mutate(Number(anio))}
              isPending={crear.isPending}
            />
          </div>
        </div>
      ) : estado.iniciadoEn ? (
        <div>
          <p>
            Torneo iniciado a las{' '}
            {new Date(estado.iniciadoEn).toLocaleTimeString()}
          </p>
          <LoadingButton
            className="mt-4 rounded bg-red-600 px-4 py-2 text-white"
            onClick={() => concluir.mutate()}
            isPending={concluir.isPending}
            label="Concluir torneo"
            pendingLabel="Concluyendo..."
          />
        </div>
      ) : (
        <LoadingButton
          className="rounded bg-red-600 px-4 py-2 text-white"
          onClick={() => iniciar.mutate()}
          isPending={iniciar.isPending}
          label="Iniciar torneo"
          pendingLabel="Iniciando..."
        />
      )}
    </div>
  )
}

function FormularioCrearTorneo(props: {
  anio: string
  setAnio: (v: string) => void
  onSubmit: () => void
  isPending: boolean
}) {
  return (
    <form
      className="mt-4 flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        props.onSubmit()
      }}
    >
      <div>
        <label className="mb-1 block font-bold">Año</label>
        <input
          className="border p-2"
          type="number"
          value={props.anio}
          onChange={(e) => props.setAnio(e.target.value)}
          required
        />
      </div>
      <LoadingButton
        className="rounded bg-blue-600 px-4 py-2 text-white"
        type="submit"
        isPending={props.isPending}
        label="Crear torneo"
        pendingLabel="Creando..."
      />
    </form>
  )
}
