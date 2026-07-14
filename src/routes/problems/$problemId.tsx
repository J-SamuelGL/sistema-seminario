import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getProblem } from '#/server/functions/problems'
import { ProblemDescription } from '#/components/ProblemDescription'
import { CodeEditor } from '#/components/CodeEditor'

export const Route = createFileRoute('/problems/$problemId')({
  loader: ({ params }) => getProblem({ data: params.problemId }),
  component: ProblemDetailPage,
})

function ProblemDetailPage() {
  const { problemId } = Route.useParams()
  const { problem } = Route.useLoaderData()
  const [language, setLanguage] = useState(problem?.allowedLanguages[0] ?? '')
  const [code, setCode] = useState('')

  if (!problem) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold">Problema no encontrado</h1>
        <p className="text-red-600">No existe un problema con el id "{problemId}".</p>
      </div>
    )
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
        {/* Run and Submit buttons wired in Task 10 and Task 12 */}
      </div>
    </div>
  )
}
