import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { registrarParticipante, reenviarCredenciales } from '#/server/functions/participantes'
import { participantesQueryOptions } from '#/server/queries/participantes'

export const Route = createFileRoute('/admin/participantes')({
  loader: ({ context }) => context.queryClient.ensureQueryData(participantesQueryOptions()),
  component: AdminParticipantsPage,
})

type Categoria = 'invitado' | 'junior' | 'senior'

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
  const [esUniversitario, setEsUniversitario] = useState(true)
  const [carnet, setCarnet] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registrados, setRegistrados] = useState<ParticipanteRegistrado[]>([])
  const { data: participantes } = useSuspenseQuery(participantesQueryOptions())

  async function handleRegistrar(e: React.FormEvent) {
    e.preventDefault()
    setRegistrando(true)
    setError(null)
    try {
      const resultado = await registrarParticipante({
        data: {
          nombre,
          correo,
          categoria: categoriaSalon,
          carnet: esUniversitario && carnet.trim() ? carnet.trim() : null,
        },
      })
      setRegistrados([resultado, ...registrados])
      setNombre('')
      setCorreo('')
      setCarnet('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRegistrando(false)
    }
  }

  async function handleReenviar(usuarioId: string) {
    const resultado = await reenviarCredenciales({ data: usuarioId })
    setRegistrados(
      registrados.map((p) =>
        p.id === usuarioId
          ? { ...p, correoEnviado: resultado.correoEnviado, contrasenaGenerada: resultado.contrasenaGenerada }
          : p,
      ),
    )
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-xl font-bold">Registrar participantes</h1>

      <div>
        <label className="mr-2 font-bold">Categoría de este salón:</label>
        <select
          className="border p-2"
          value={categoriaSalon}
          onChange={(e) => setCategoriaSalon(e.target.value as Categoria)}
        >
          <option value="invitado">Invitados</option>
          <option value="junior">Junior</option>
          <option value="senior">Senior</option>
        </select>
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
          required
        />
        <label>
          <input
            type="checkbox"
            checked={esUniversitario}
            onChange={(e) => setEsUniversitario(e.target.checked)}
          />{' '}
          Es universitario (tiene carné)
        </label>
        {esUniversitario && (
          <input
            className="border p-2"
            placeholder="Carné"
            value={carnet}
            onChange={(e) => setCarnet(e.target.value)}
          />
        )}
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:bg-gray-300"
          type="submit"
          disabled={registrando}
        >
          {registrando ? 'Registrando...' : `Registrar como ${categoriaSalon}`}
        </button>
        {error && <p className="text-red-600">{error}</p>}
      </form>

      <ul className="flex flex-col gap-2">
        {registrados.map((p) => (
          <li key={p.id} className="border p-2">
            <strong>{p.nombre}</strong> — {p.correo} — {p.categoria}
            {p.correoEnviado ? (
              <span className="ml-2 text-green-600">✅ correo enviado</span>
            ) : (
              <span className="ml-2 text-yellow-600">
                ⚠️ no se pudo enviar el correo — contraseña: {p.contrasenaGenerada}
              </span>
            )}
            <button
              className="ml-2 text-blue-600 underline"
              onClick={() => handleReenviar(p.id)}
            >
              Reenviar credenciales
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
            <th className="border p-2 text-left">Check-in</th>
            <th className="border p-2 text-left">Envíos</th>
          </tr>
        </thead>
        <tbody>
          {participantes.map((p) => (
            <tr key={p.id}>
              <td className="border p-2">{p.nombre}</td>
              <td className="border p-2">{p.correo}</td>
              <td className="border p-2">{p.categoria}</td>
              <td className="border p-2">{p.ingresadoEn ? '✅' : '—'}</td>
              <td className="border p-2">{p.cantidadEnvios}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
