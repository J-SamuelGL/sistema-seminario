import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { QrScanner } from '#/components/QrScanner'
import { checkinByToken } from '#/server/functions/checkin'
import type { CheckinResult } from '#/server/checkin/result'

export const Route = createFileRoute('/admin/checkin')({
  component: CheckinPage,
})

function CheckinPage() {
  const [lastResult, setLastResult] = useState<CheckinResult | null>(null)

  async function handleScan(token: string) {
    const result = await checkinByToken({ data: token })
    setLastResult(result)
  }

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h1 className="text-xl font-bold">Check-in</h1>
      <QrScanner onScan={handleScan} />
      {lastResult?.status === 'checked_in' && (
        <p className="text-green-600">✅ {lastResult.userName} presente</p>
      )}
      {lastResult?.status === 'already_checked_in' && (
        <p className="text-yellow-600">
          ⚠️ {lastResult.userName} ya había hecho check-in
        </p>
      )}
      {lastResult?.status === 'not_found' && (
        <p className="text-red-600">❌ Código no reconocido</p>
      )}
    </div>
  )
}
