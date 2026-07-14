import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getProblem } from '#/server/functions/problems'
import { runCode } from '#/server/functions/run'
import { submitCode } from '#/server/functions/submit'
import { ProblemDescription } from '#/components/ProblemDescription'
import { CodeEditor } from '#/components/CodeEditor'
import { RunResults } from '#/components/RunResults'
import { SubmitResult } from '#/components/SubmitResult'
import type { CaseResult } from '#/server/judge/verdict'

export const Route = createFileRoute('/problems/$problemId')({
  loader: ({ params }) => getProblem({ data: params.problemId }),
  component: ProblemDetailPage,
})

function ProblemDetailPage() {
  const { problemId } = Route.useParams()
  const { problem } = Route.useLoaderData()
  const [language, setLanguage] = useState(problem?.allowedLanguages[0] ?? '')
  const [code, setCode] = useState('')
  const [runResults, setRunResults] = useState<CaseResult[] | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ submissionId: string; verdict: string } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!problem) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold">Problema no encontrado</h1>
        <p className="text-red-600">No existe un problema con el id "{problemId}".</p>
      </div>
    )
  }

  const currentProblemId = problem.id

  async function handleRun() {
    setIsRunning(true)
    try {
      const { results, error } = await runCode({ data: { problemId: currentProblemId, language, code } })
      setRunResults(results)
      setRunError(error)
    } finally {
      setIsRunning(false)
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const result = await submitCode({ data: { problemId: currentProblemId, language, code } })
      if (result.error || !result.verdict) {
        setSubmitError(result.error ?? 'No se pudo evaluar el envío.')
        setSubmitResult(null)
      } else {
        setSubmitResult({ submissionId: result.submissionId, verdict: result.verdict })
        setSubmitError(null)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <ProblemDescription title={problem.title} description={problem.description} difficulty={problem.difficulty} />
      <div>
        <select className="border p-2" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {problem.allowedLanguages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <CodeEditor language={language} value={code} onChange={setCode} />
        <button className="mt-2 rounded bg-gray-700 px-4 py-2 text-white" onClick={handleRun} disabled={isRunning}>
          {isRunning ? 'Ejecutando...' : 'Run'}
        </button>
        {runError && <p className="mt-4 text-red-600">{runError}</p>}
        {!runError && runResults && <RunResults results={runResults} />}
        <button
          className="mt-2 ml-2 rounded bg-blue-600 px-4 py-2 text-white"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Enviando...' : 'Submit'}
        </button>
        {submitError && <p className="mt-4 text-red-600">{submitError}</p>}
        {!submitError && submitResult && (
          <SubmitResult submissionId={submitResult.submissionId} verdict={submitResult.verdict} />
        )}
      </div>
    </div>
  )
}
