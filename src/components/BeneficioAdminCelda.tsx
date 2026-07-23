import { useState } from 'react'
import { LoadingButton } from '#/components/LoadingButton'
import { ADMIN_INPUT_BASE, ADMIN_BUTTON_SECONDARY } from '#/components/adminBrandStyles'
import { CATALOGO_BENEFICIOS, INGENIEROS } from '#/shared/beneficios'
import type { ClaveBeneficio, Ingeniero } from '#/shared/beneficios'

export type BeneficioParticipante = {
  clave: string
  usadoEn: Date | null
  objetivoUsuarioId: string | null
  objetivoUsuarioNombre: string | null
  objetivoIngeniero: string | null
} | null

export type RegistrarBeneficioInput = {
  usuarioId: string
  objetivoUsuarioId?: string | null
  objetivoIngeniero?: Ingeniero | null
}

export function BeneficioAdminCelda({
  usuarioId,
  beneficio,
  opcionesObjetivo,
  onRegistrar,
  estaGuardando,
}: {
  usuarioId: string
  beneficio: BeneficioParticipante
  opcionesObjetivo: { id: string; nombre: string }[]
  onRegistrar: (input: RegistrarBeneficioInput) => void
  estaGuardando: boolean
}) {
  const [objetivoUsuarioId, setObjetivoUsuarioId] = useState(
    beneficio?.objetivoUsuarioId ?? '',
  )
  const [objetivoIngeniero, setObjetivoIngeniero] = useState(
    beneficio?.objetivoIngeniero ?? '',
  )

  if (!beneficio) {
    return <span className="text-admin-ink-faint">—</span>
  }

  const definicion = CATALOGO_BENEFICIOS[beneficio.clave as ClaveBeneficio]

  function handleRegistrar() {
    onRegistrar({
      usuarioId,
      objetivoUsuarioId:
        definicion.tipoObjetivo === 'participante'
          ? objetivoUsuarioId || null
          : null,
      objetivoIngeniero:
        definicion.tipoObjetivo === 'ingeniero'
          ? ((objetivoIngeniero || null) as Ingeniero | null)
          : null,
    })
  }

  return (
    <div className="flex flex-col gap-1.5 py-1">
      <span className="text-admin-ink-soft">{definicion.texto}</span>

      {definicion.tipoObjetivo === 'participante' && (
        <select
          className={ADMIN_INPUT_BASE}
          value={objetivoUsuarioId}
          onChange={(e) => setObjetivoUsuarioId(e.target.value)}
        >
          <option value="">Elegir participante</option>
          {opcionesObjetivo.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
        </select>
      )}

      {definicion.tipoObjetivo === 'ingeniero' && (
        <select
          className={ADMIN_INPUT_BASE}
          value={objetivoIngeniero}
          onChange={(e) => setObjetivoIngeniero(e.target.value)}
        >
          <option value="">Elegir ingeniero</option>
          {INGENIEROS.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      )}

      <LoadingButton
        className={`self-start ${ADMIN_BUTTON_SECONDARY}`}
        isPending={estaGuardando}
        label={beneficio.usadoEn ? 'Actualizar' : 'Marcar como usada'}
        pendingLabel="Guardando..."
        onClick={handleRegistrar}
        wrapperClassName="inline-flex items-center gap-1"
        spinnerClassName="h-3 w-3"
      />

      {beneficio.usadoEn && (
        <span className="text-[12px] text-admin-ink-faint">
          Usada: {new Date(beneficio.usadoEn).toLocaleString('es-GT')}
          {beneficio.objetivoUsuarioNombre
            ? ` — objetivo: ${beneficio.objetivoUsuarioNombre}`
            : ''}
          {beneficio.objetivoIngeniero
            ? ` — ingeniero: ${beneficio.objetivoIngeniero}`
            : ''}
        </span>
      )}
    </div>
  )
}
