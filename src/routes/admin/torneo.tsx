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
import {
  ADMIN_CARD_ACCENTED,
  ADMIN_TITLE,
  ADMIN_LABEL_BASE,
  ADMIN_INPUT_BASE,
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_DANGER,
} from '#/components/adminBrandStyles'

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
      queryClient.setQueryData(estadoTorneoQueryOptions().queryKey, (previo) =>
        previo
          ? { ...previo, iniciadoEn: resultado.iniciadoEn, finalizadoEn: null }
          : previo,
      )
      toast.success('Torneo iniciado.')
    },
  })

  const concluir = useToastMutation({
    mutationFn: () => concluirTorneo(),
    onSuccess: (resultado) => {
      queryClient.setQueryData(estadoTorneoQueryOptions().queryKey, (previo) =>
        previo ? { ...previo, finalizadoEn: resultado.finalizadoEn } : previo,
      )
      toast.success('Torneo concluido.')
    },
  })

  if (!estado) {
    return (
      <div className="mx-auto max-w-[560px] px-8 py-8">
        <h1 className={`text-2xl ${ADMIN_TITLE}`}>Control del torneo</h1>
        <p className="mt-2 text-admin-ink-soft">
          No hay ningún torneo creado todavía.
        </p>
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
    <div className="mx-auto max-w-[560px] px-8 py-8">
      <h1 className={`text-2xl ${ADMIN_TITLE}`}>
        Control del torneo {estado.anio}
      </h1>
      {estado.finalizadoEn ? (
        <div className={`${ADMIN_CARD_ACCENTED} mt-4 p-6`}>
          <p className="text-admin-ink-soft">
            Torneo concluido a las{' '}
            {new Date(estado.finalizadoEn).toLocaleTimeString()}
          </p>
          <div className="mt-6 border-t border-admin-line/40 pt-4">
            <h2 className={ADMIN_TITLE}>Crear el torneo del siguiente año</h2>
            <FormularioCrearTorneo
              anio={anio}
              setAnio={setAnio}
              onSubmit={() => crear.mutate(Number(anio))}
              isPending={crear.isPending}
            />
          </div>
        </div>
      ) : estado.iniciadoEn ? (
        <div className={`${ADMIN_CARD_ACCENTED} mt-4 p-6`}>
          <p className="text-admin-ink-soft">
            Torneo iniciado a las{' '}
            {new Date(estado.iniciadoEn).toLocaleTimeString()}
          </p>
          <LoadingButton
            className={`mt-4 ${ADMIN_BUTTON_DANGER}`}
            onClick={() => concluir.mutate()}
            isPending={concluir.isPending}
            label="Concluir torneo"
            pendingLabel="Concluyendo..."
          />
        </div>
      ) : (
        <LoadingButton
          className={`mt-4 ${ADMIN_BUTTON_PRIMARY}`}
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
      className="mt-4 flex items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        props.onSubmit()
      }}
    >
      <div>
        <label className={`${ADMIN_LABEL_BASE} mb-1 block`}>Año</label>
        <input
          className={ADMIN_INPUT_BASE}
          type="number"
          value={props.anio}
          onChange={(e) => props.setAnio(e.target.value)}
          required
        />
      </div>
      <LoadingButton
        className={ADMIN_BUTTON_PRIMARY}
        type="submit"
        isPending={props.isPending}
        label="Crear torneo"
        pendingLabel="Creando..."
      />
    </form>
  )
}
