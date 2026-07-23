import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  registrarParticipante,
  reenviarCredenciales,
  eliminarParticipante,
} from '#/server/functions/participantes'
import { participantesQueryOptions } from '#/server/queries/participantes'
import { puedeEliminarParticipante } from '#/shared/participantes'
import { datosParticipanteSchema } from '#/server/participantes/validar'
import type { Categoria, Semestre } from '#/server/participantes/validar'
import { registrarUsoBeneficio } from '#/server/functions/beneficios'
import { LoadingButton } from '#/components/LoadingButton'
import { SegmentedControl } from '#/components/SegmentedControl'
import { useRegistroConCredenciales } from '#/components/useRegistroConCredenciales'
import { useToastMutation } from '#/components/useToastMutation'
import {
  BeneficioAdminCelda,
  type RegistrarBeneficioInput,
} from '#/components/BeneficioAdminCelda'
import {
  CLASE_TABLA,
  CLASE_FILA_ADMIN,
  CLASE_ENCABEZADO_ADMIN,
} from '#/components/tableStyles'
import {
  ADMIN_CARD,
  ADMIN_CARD_ACCENTED,
  ADMIN_TITLE,
  ADMIN_LABEL_BASE,
  ADMIN_INPUT_BASE,
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_DANGER,
  ADMIN_LINK,
} from '#/components/adminBrandStyles'

export const Route = createFileRoute('/admin/participantes')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(participantesQueryOptions()),
  component: AdminParticipantsPage,
})

const SEMESTRES: Semestre[] = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
]

const CATEGORIAS: { valor: Categoria; etiqueta: string }[] = [
  { valor: 'invitado', etiqueta: 'Invitados' },
  { valor: 'junior', etiqueta: 'Junior' },
  { valor: 'senior', etiqueta: 'Senior' },
]

function AdminParticipantsPage() {
  const [categoriaSalon, setCategoriaSalon] = useState<Categoria>('invitado')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [carnet, setCarnet] = useState('')
  const [semestreSalon, setSemestreSalon] = useState<Semestre | ''>('')
  const requiereCarnetYSemestre =
    categoriaSalon === 'junior' || categoriaSalon === 'senior'
  const { data: participantes } = useSuspenseQuery(participantesQueryOptions())
  const queryClient = useQueryClient()

  const {
    registrados,
    crear: registrar,
    eliminar,
    actualizarRegistro,
    estaEliminando,
  } = useRegistroConCredenciales({
    crearFn: registrarParticipante,
    eliminarFn: eliminarParticipante,
    queryClient,
    queryKey: participantesQueryOptions().queryKey,
    mensajeRegistrado: 'Participante registrado.',
    mensajeEliminado: 'Participante eliminado.',
    alRegistrar: () => {
      setNombre('')
      setCorreo('')
      setCarnet('')
    },
  })

  const reenviar = useToastMutation({
    mutationFn: (usuarioId: string) =>
      reenviarCredenciales({ data: usuarioId }),
    onSuccess: (resultado, usuarioId) => {
      actualizarRegistro(usuarioId, {
        correoEnviado: resultado.correoEnviado,
        contrasenaGenerada: resultado.contrasenaGenerada,
      })
      toast.success('Credenciales reenviadas.')
    },
  })

  const registrarBeneficio = useToastMutation({
    mutationFn: (input: RegistrarBeneficioInput) =>
      registrarUsoBeneficio({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: participantesQueryOptions().queryKey,
      })
      toast.success('Beneficio registrado.')
    },
  })

  function handleRegistrar(e: React.FormEvent) {
    e.preventDefault()

    const validacion = datosParticipanteSchema.safeParse({
      nombre,
      correo,
      categoria: categoriaSalon,
      carnet: requiereCarnetYSemestre && carnet.trim() ? carnet.trim() : null,
      semestre: requiereCarnetYSemestre && semestreSalon ? semestreSalon : null,
    })
    if (!validacion.success) {
      toast.error(validacion.error.issues[0].message)
      return
    }

    registrar.mutate(validacion.data)
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-8 py-8">
      <h1 className={`text-2xl ${ADMIN_TITLE}`}>Registrar participantes</h1>

      <div className={`${ADMIN_CARD_ACCENTED} flex flex-col gap-6 p-6`}>
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className={`${ADMIN_LABEL_BASE} mb-2 block`}>
              Categoría de este salón
            </label>
            <SegmentedControl
              options={CATEGORIAS}
              value={categoriaSalon}
              onChange={(valor) => {
                setCategoriaSalon(valor)
                setSemestreSalon('')
              }}
            />
          </div>

          {requiereCarnetYSemestre && (
            <div>
              <label className={`${ADMIN_LABEL_BASE} mb-2 block`}>
                Semestre de este salón
              </label>
              <select
                className={ADMIN_INPUT_BASE}
                value={semestreSalon}
                onChange={(e) => setSemestreSalon(e.target.value as Semestre)}
                required
              >
                <option value="" disabled>
                  Semestre
                </option>
                {SEMESTRES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <form className="flex flex-col gap-3" onSubmit={handleRegistrar}>
          <input
            className={ADMIN_INPUT_BASE}
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          <input
            className={ADMIN_INPUT_BASE}
            type="email"
            placeholder="Correo"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            maxLength={255}
            required
          />
          {requiereCarnetYSemestre && (
            <input
              className={ADMIN_INPUT_BASE}
              placeholder="Carné"
              value={carnet}
              onChange={(e) => setCarnet(e.target.value)}
              required
            />
          )}
          <LoadingButton
            className={`self-start ${ADMIN_BUTTON_PRIMARY}`}
            type="submit"
            isPending={registrar.isPending}
            label={`Registrar como ${categoriaSalon}`}
            pendingLabel="Registrando..."
          />
        </form>
      </div>

      {registrados.length > 0 && (
        <ul className="flex flex-col gap-2">
          {registrados.map((p) => (
            <li key={p.id} className={`${ADMIN_CARD} p-3 text-sm`}>
              <strong className="text-admin-ink">{p.nombre}</strong>{' '}
              <span className="text-admin-ink-soft">
                — {p.correo} — {p.categoria}
              </span>
              {p.correoEnviado ? (
                <span className="ml-2 text-admin-navy-strong">
                  ✅ correo enviado
                </span>
              ) : (
                <span className="ml-2 text-admin-gold">
                  ⚠️ no se pudo enviar el correo — contraseña:{' '}
                  {p.contrasenaGenerada}
                </span>
              )}
              <LoadingButton
                className={`ml-2 ${ADMIN_LINK} disabled:cursor-not-allowed disabled:text-admin-ink-faint`}
                disabled={reenviar.isPending}
                onClick={() => reenviar.mutate(p.id)}
                isPending={reenviar.isPending && reenviar.variables === p.id}
                label="Reenviar credenciales"
                pendingLabel="Reenviando..."
                wrapperClassName="inline-flex items-center gap-1"
                spinnerClassName="h-3 w-3"
              />
            </li>
          ))}
        </ul>
      )}

      <h2 className={`text-lg ${ADMIN_TITLE}`}>
        Todos los participantes registrados
      </h2>
      <div className={`${ADMIN_CARD} overflow-x-auto`}>
        <table className={CLASE_TABLA}>
          <thead>
            <tr className={CLASE_ENCABEZADO_ADMIN}>
              <th className="p-3">Nombre</th>
              <th className="p-3">Correo</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Semestre</th>
              <th className="p-3">Check-in</th>
              <th className="p-3">Envíos</th>
              <th className="p-3">Beneficio</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {participantes.map((p) => {
              const permiso = puedeEliminarParticipante({
                rol: 'participante',
                cantidadEnvios: p.cantidadEnvios,
              })
              return (
                <tr key={p.id} className={CLASE_FILA_ADMIN}>
                  <td className="p-3 text-admin-ink">{p.nombre}</td>
                  <td className="p-3 text-admin-ink-soft">{p.correo}</td>
                  <td className="p-3 text-admin-ink-soft">{p.categoria}</td>
                  <td className="p-3 text-admin-ink-soft">
                    {p.semestre ?? '—'}
                  </td>
                  <td className="p-3">{p.ingresadoEn ? '✅' : '—'}</td>
                  <td className="p-3 text-admin-ink-soft">
                    {p.cantidadEnvios}
                  </td>
                  <td className="p-3">
                    <BeneficioAdminCelda
                      usuarioId={p.id}
                      beneficio={p.beneficio}
                      opcionesObjetivo={participantes
                        .filter((x) => x.id !== p.id)
                        .map((x) => ({ id: x.id, nombre: x.nombre }))}
                      onRegistrar={(input) => registrarBeneficio.mutate(input)}
                      estaGuardando={
                        registrarBeneficio.isPending &&
                        registrarBeneficio.variables?.usuarioId === p.id
                      }
                    />
                  </td>
                  <td className="p-3">
                    <LoadingButton
                      className={
                        permiso.puede
                          ? ADMIN_BUTTON_DANGER
                          : `${ADMIN_BUTTON_DANGER} opacity-50`
                      }
                      disabled={!permiso.puede || eliminar.isPending}
                      title={permiso.puede ? undefined : permiso.motivo}
                      onClick={() => eliminar.mutate(p.id)}
                      isPending={estaEliminando(p.id)}
                      label="Eliminar"
                      pendingLabel="Eliminando..."
                      wrapperClassName="inline-flex items-center gap-1"
                      spinnerClassName="h-3 w-3"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
