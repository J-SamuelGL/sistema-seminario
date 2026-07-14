import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pistonExecute } from '../src/server/piston/client'

describe('pistonExecute', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends the mapped language/version and parses stdout', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ run: { stdout: 'hi\n', stderr: '', code: 0, signal: null } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await pistonExecute('python', 'print("hi")', '')

    expect(result).toEqual({ stdout: 'hi\n', stderr: '', exitCode: 0, timedOut: false })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v2/execute')
    const body = JSON.parse(options.body)
    expect(body.language).toBe('python')
    expect(body.files[0].content).toBe('print("hi")')
  })

  it('marks timedOut when Piston reports SIGKILL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ run: { stdout: '', stderr: '', code: 1, signal: 'SIGKILL' } }),
      }),
    )
    const result = await pistonExecute('python', 'while True: pass', '')
    expect(result.timedOut).toBe(true)
  })

  it('throws for an unsupported language', async () => {
    await expect(pistonExecute('cobol', 'x', '')).rejects.toThrow('Unsupported language: cobol')
  })
})
