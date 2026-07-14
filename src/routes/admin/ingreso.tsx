import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { QrScanner } from '#/components/QrScanner'
import { registrarIngresoPorToken } from '#/server/functions/checkin'
import type { ResultadoIngreso } from '#/server/checkin/result'

export const Route = createFileRoute('/admin/ingreso')({
  component: CheckinPage,
})

function CheckinPage() {
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoIngreso | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleScan(token: string) {
    try {
      const resultado = await registrarIngresoPorToken({ data: token })
      setUltimoResultado(resultado)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h1 className="text-xl font-bold">Check-in</h1>
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
