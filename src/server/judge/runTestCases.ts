import { pistonExecute } from '../piston/client'
import { determineVerdict, type CaseResult, type Verdict } from './verdict'

export type TestCase = { input: string; expectedOutput: string }

export async function runTestCases(
  language: string,
  code: string,
  testCases: TestCase[],
): Promise<{ results: CaseResult[]; verdict: Verdict }> {
  const results: CaseResult[] = []

  for (const testCase of testCases) {
    const output = await pistonExecute(language, code, testCase.input)
    const actualOutput = output.stdout.trim()
    results.push({
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput,
      passed: actualOutput === testCase.expectedOutput.trim(),
      stderr: output.stderr,
      timedOut: output.timedOut,
    })
  }

  return { results, verdict: determineVerdict(results) }
}
