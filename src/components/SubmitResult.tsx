import { useEffect, useState } from 'react'
import { getSubmission } from '#/server/functions/submit'

export function SubmitResult({ submissionId, verdict }: { submissionId: string; verdict: string }) {
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const interval = setInterval(() => {
      getSubmission({ data: submissionId })
        .then((submission) => {
          if (!cancelled && submission?.claudeFeedback) {
            setFeedback(submission.claudeFeedback)
            clearInterval(interval)
          }
        })
        .catch((err: unknown) => console.error('Failed to poll submission', err))
    }, 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [submissionId])

  return (
    <div className="mt-4 rounded border p-4">
      <p className="font-bold">Veredicto: {verdict}</p>
      <p className="mt-2 text-sm text-gray-600">{feedback ?? 'Generando feedback...'}</p>
    </div>
  )
}
