export type CaseResult = {
  input: string
  expectedOutput: string
  actualOutput: string
  passed: boolean
  stderr: string
  timedOut: boolean
}

export type Verdict = 'accepted' | 'wrong_answer' | 'runtime_error' | 'timeout'

export function determineVerdict(results: CaseResult[]): Verdict {
  if (results.some((r) => r.timedOut)) return 'timeout'
  if (results.some((r) => r.stderr.trim().length > 0)) return 'runtime_error'
  return results.every((r) => r.passed) ? 'accepted' : 'wrong_answer'
}
