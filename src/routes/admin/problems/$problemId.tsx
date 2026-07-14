import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getProblem, createProblem, updateProblem } from '#/server/functions/problems'
import { AdminProblemForm } from '#/components/AdminProblemForm'
import type { ProblemFormValue } from '#/components/AdminProblemForm'

export const Route = createFileRoute('/admin/problems/$problemId')({
  loader: async ({ params }) => {
    if (params.problemId === 'new') return null
    return getProblem({ data: params.problemId })
  },
  component: AdminProblemEditPage,
})

function AdminProblemEditPage() {
  const { problemId } = Route.useParams()
  const data = Route.useLoaderData()
  const navigate = useNavigate()

  const initial: ProblemFormValue =
    data && data.problem
      ? {
          title: data.problem.title,
          description: data.problem.description,
          difficulty: data.problem.difficulty,
          allowedLanguages: data.problem.allowedLanguages,
          sortOrder: data.problem.sortOrder,
          testCases: data.testCases.map((tc) => ({ input: tc.input, expectedOutput: tc.expectedOutput })),
        }
      : { title: '', description: '', difficulty: 'easy', allowedLanguages: [], sortOrder: 0, testCases: [] }

  async function handleSubmit(value: ProblemFormValue) {
    if (problemId === 'new') {
      await createProblem({ data: value })
    } else {
      await updateProblem({ data: { ...value, id: problemId } })
    }
    await navigate({ to: '/admin/problems' })
  }

  return <AdminProblemForm initial={initial} onSubmit={handleSubmit} />
}
