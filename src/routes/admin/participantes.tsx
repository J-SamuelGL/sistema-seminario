import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  registrarParticipante,
  reenviarCredenciales,
  eliminarParticipante,
} from '#/server/functions/participantes'
import { participantesQueryOptions } from '#/server/queries/participantes'
import { puedeEliminarParticipante } from '#/server/participantes/eliminar'
import { datosParticipanteSchema } from '#/server/participantes/validar'
import type { Categoria, Semestre } from '#/server/participantes/validar'
import { Spinner } from '#/components/Spinner'

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

type ParticipanteRegistrado = {
  id: string
  nombre: string
  correo: string
  categoria: Categoria
  correoEnviado: boolean
  contrasenaGenerada: string
}

function AdminParticipantsPage() {
  const [categoriaSalon, setCategoriaSalon] = useState<Categoria>('invitado')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [carnet, setCarnet] = useState('')
  const [semestreSalon, setSemestreSalon] = useState<Semestre | ''>('')
  const requiereCarnetYSemestre =
    categoriaSalon === 'junior' || categoriaSalon === 'senior'
  const [registrados, setRegistrados] = useState<ParticipanteRegistrado[]>([])
  const { data: participantes } = useSuspenseQuery(participantesQueryOptions())
  const queryClient = useQueryClient()

  const registrar = useMutation({
    mutationFn: (datos: {
      nombre: string
      correo: string
      categoria: Categoria
      carnet: string | null
      semestre: Semestre | null
    }) => registrarParticipante({ data: datos }),
    onSuccess: (resultado) => {
      setRegistrados((prev) => [resultado, ...prev])
      setNombre('')
      setCorreo('')
      setCarnet('')
      queryClient.invalidateQueries({
        queryKey: participantesQueryOptions().queryKey,
      })
      toast.success('Participante registrado.')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  })

  const reenviar = useMutation({
    mutationFn: (usuarioId: string) => reenviarCredenciales({ data: usuarioId }),
    onSuccess: (resultado, usuarioId) => {
      setRegistrados((prev) =>
        prev.map((p) =>
          p.id === usuarioId
            ? {
                ...p,
                correoEnviado: resultado.correoEnviado,
                contrasenaGenerada: resultado.contrasenaGenerada,
              }
            : p,
        ),
      )
      toast.success('Credenciales reenviadas.')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  })

  const eliminar = useMutation({
    mutationFn: (usuarioId: string) =>
      eliminarParticipante({ data: usuarioId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: participantesQueryOptions().queryKey,
      })
      toast.success('Participante eliminado.')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
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
          <div className="flex gap-2">
            {CATEGORIAS.map((c) => (
              <button
                key={c.valor}
                type="button"
                onClick={() => {
                  setCategoriaSalon(c.valor)
                  setSemestreSalon('')
                }}
                className={
                  'rounded-full px-4 py-1.5 text-sm font-medium ' +
                  (categoriaSalon === c.valor
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                }
              >
                {c.etiqueta}
              </button>
            ))}
          </div>
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
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:bg-gray-300"
          type="submit"
          disabled={registrar.isPending}
        >
          {registrar.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner /> Registrando...
            </span>
          ) : (
            `Registrar como ${categoriaSalon}`
          )}
        </button>
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
            <button
              className="ml-2 text-blue-600 underline disabled:text-gray-400"
              disabled={reenviar.isPending}
              onClick={() => reenviar.mutate(p.id)}
            >
              {reenviar.isPending ? (
                <span className="inline-flex items-center gap-1">
                  <Spinner className="h-3 w-3" /> Reenviando...
                </span>
              ) : (
                'Reenviar credenciales'
              )}
            </button>
          </li>
        ))}
      </ul>

      <h2 className="text-lg font-bold">Todos los participantes registrados</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2 text-left">Nombre</th>
            <th className="border p-2 text-left">Correo</th>
            <th className="border p-2 text-left">Categoría</th>
            <th className="border p-2 text-left">Semestre</th>
            <th className="border p-2 text-left">Check-in</th>
            <th className="border p-2 text-left">Envíos</th>
            <th className="border p-2 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {participantes.map((p) => {
            const permiso = puedeEliminarParticipante({
              rol: 'participante',
              cantidadEnvios: p.cantidadEnvios,
            })
            return (
              <tr key={p.id}>
                <td className="border p-2">{p.nombre}</td>
                <td className="border p-2">{p.correo}</td>
                <td className="border p-2">{p.categoria}</td>
                <td className="border p-2">{p.semestre ?? '—'}</td>
                <td className="border p-2">{p.ingresadoEn ? '✅' : '—'}</td>
                <td className="border p-2">{p.cantidadEnvios}</td>
                <td className="border p-2">
                  <button
                    className="text-red-600 underline disabled:text-gray-400 disabled:no-underline"
                    disabled={!permiso.puede || eliminar.isPending}
                    title={permiso.puede ? undefined : permiso.motivo}
                    onClick={() => eliminar.mutate(p.id)}
                  >
                    {eliminar.isPending && eliminar.variables === p.id ? (
                      <span className="inline-flex items-center gap-1">
                        <Spinner className="h-3 w-3" /> Eliminando...
                      </span>
                    ) : (
                      'Eliminar'
                    )}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
