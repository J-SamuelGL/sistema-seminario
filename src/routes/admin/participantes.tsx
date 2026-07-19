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
import { LoadingButton } from '#/components/LoadingButton'
import { SegmentedControl } from '#/components/SegmentedControl'
import { useRegistroConCredenciales } from '#/components/useRegistroConCredenciales'
import { useToastMutation } from '#/components/useToastMutation'
import { CLASE_TABLA, CLASE_FILA } from '#/components/tableStyles'

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
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-xl font-bold">Registrar participantes</h1>

      <div className="flex items-end gap-6">
        <div>
          <label className="mb-2 block font-bold">
            Categoría de este salón:
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
            <label className="mb-2 block font-bold">
              Semestre de este salón:
            </label>
            <select
              className="border p-2"
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

      <form className="flex flex-col gap-2" onSubmit={handleRegistrar}>
        <input
          className="border p-2"
          placeholder="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
        <input
          className="border p-2"
          type="email"
          placeholder="Correo"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          maxLength={255}
          required
        />
        {requiereCarnetYSemestre && (
          <input
            className="border p-2"
            placeholder="Carné"
            value={carnet}
            onChange={(e) => setCarnet(e.target.value)}
            required
          />
        )}
        <LoadingButton
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:bg-gray-300"
          type="submit"
          isPending={registrar.isPending}
          label={`Registrar como ${categoriaSalon}`}
          pendingLabel="Registrando..."
        />
      </form>

      <ul className="flex flex-col gap-2">
        {registrados.map((p) => (
          <li key={p.id} className="border p-2">
            <strong>{p.nombre}</strong> — {p.correo} — {p.categoria}
            {p.correoEnviado ? (
              <span className="ml-2 text-green-600">✅ correo enviado</span>
            ) : (
              <span className="ml-2 text-yellow-600">
                ⚠️ no se pudo enviar el correo — contraseña:{' '}
                {p.contrasenaGenerada}
              </span>
            )}
            <LoadingButton
              className="ml-2 text-blue-600 underline disabled:text-gray-400"
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

      <h2 className="text-lg font-bold">Todos los participantes registrados</h2>
      <table className={CLASE_TABLA}>
        <thead>
          <tr className={CLASE_FILA}>
            <th className="p-2">Nombre</th>
            <th className="p-2">Correo</th>
            <th className="p-2">Categoría</th>
            <th className="p-2">Semestre</th>
            <th className="p-2">Check-in</th>
            <th className="p-2">Envíos</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {participantes.map((p) => {
            const permiso = puedeEliminarParticipante({
              rol: 'participante',
              cantidadEnvios: p.cantidadEnvios,
            })
            return (
              <tr key={p.id} className={CLASE_FILA}>
                <td className="p-2">{p.nombre}</td>
                <td className="p-2">{p.correo}</td>
                <td className="p-2">{p.categoria}</td>
                <td className="p-2">{p.semestre ?? '—'}</td>
                <td className="p-2">{p.ingresadoEn ? '✅' : '—'}</td>
                <td className="p-2">{p.cantidadEnvios}</td>
                <td className="p-2">
                  <LoadingButton
                    className="text-red-600 underline disabled:text-gray-400 disabled:no-underline"
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
  )
}
