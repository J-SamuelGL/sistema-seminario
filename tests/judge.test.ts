import { describe, it, expect, vi } from 'vitest'
import { determineVerdict } from '../src/server/judge/verdict'
import { runTestCases } from '../src/server/judge/runTestCases'

vi.mock('../src/server/piston/client', () => ({
  pistonExecute: vi.fn(),
}))
import { pistonExecute } from '../src/server/piston/client'

describe('determineVerdict', () => {
  it('returns accepted when all cases pass', () => {
    const verdict = determineVerdict([
      { input: '1', expectedOutput: '2', actualOutput: '2', passed: true, stderr: '', timedOut: false },
    ])
    expect(verdict).toBe('accepted')
  })

  it('returns wrong_answer when a case fails without error', () => {
    const verdict = determineVerdict([
      { input: '1', expectedOutput: '2', actualOutput: '3', passed: false, stderr: '', timedOut: false },
    ])
    expect(verdict).toBe('wrong_answer')
  })

  it('returns runtime_error when stderr is present', () => {
    const verdict = determineVerdict([
      { input: '1', expectedOutput: '2', actualOutput: '', passed: false, stderr: 'Traceback', timedOut: false },
    ])
    expect(verdict).toBe('runtime_error')
  })

  it('returns timeout when a case timed out, taking priority over other failures', () => {
    const verdict = determineVerdict([
      { input: '1', expectedOutput: '2', actualOutput: '', passed: false, stderr: 'Traceback', timedOut: true },
    ])
    expect(verdict).toBe('timeout')
  })
})

describe('runTestCases', () => {
  it('runs each test case through Piston and aggregates the verdict', async () => {
    vi.mocked(pistonExecute).mockImplementation(async (_lang, _code, stdin) => ({
      stdout: stdin === '1 2' ? '3' : '999',
      stderr: '',
      exitCode: 0,
      timedOut: false,
    }))

    const { results, verdict } = await runTestCases('python', 'code', [
      { input: '1 2', expectedOutput: '3' },
      { input: '5 5', expectedOutput: '10' },
    ])

    expect(results[0].passed).toBe(true)
    expect(results[1].passed).toBe(false)
    expect(verdict).toBe('wrong_answer')
  })
})
