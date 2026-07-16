import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { QrScanner } from '#/components/QrScanner'
import { registrarIngresoPorToken } from '#/server/functions/checkin'
import { participantesQueryOptions } from '#/server/queries/participantes'
import type { ResultadoIngreso } from '#/server/checkin/result'

export const Route = createFileRoute('/admin/ingreso')({
  loader: ({ context }) => context.queryClient.ensureQueryData(participantesQueryOptions()),
  component: CheckinPage,
})

function CheckinPage() {
  const queryClient = useQueryClient()
  const { data: participantes } = useSuspenseQuery(participantesQueryOptions())
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoIngreso | null>(null)
  const [error, setError] = useState<string | null>(null)

  const yaIngresados = participantes.filter((p) => p.ingresadoEn).length

  async function handleScan(token: string) {
    try {
      const resultado = await registrarIngresoPorToken({ data: token })
      setUltimoResultado(resultado)
      setError(null)
      queryClient.invalidateQueries({ queryKey: participantesQueryOptions().queryKey })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h1 className="text-xl font-bold">Check-in</h1>
      <p className="text-sm text-gray-600">
        {yaIngresados} de {participantes.length} participantes ya hicieron check-in
      </p>
      <QrScanner onScan={handleScan} />
      {ultimoResultado?.status === 'ingresado' && (
        <p className="text-green-600">✅ {ultimoResultado.nombreUsuario} presente</p>
      )}
      {ultimoResultado?.status === 'ya_ingresado' && (
        <p className="text-yellow-600">
          ⚠️ {ultimoResultado.nombreUsuario} ya había hecho check-in
        </p>
      )}
      {ultimoResultado?.status === 'no_encontrado' && (
        <p className="text-red-600">❌ Código no reconocido</p>
      )}
      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  )
}
