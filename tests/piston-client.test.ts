import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ejecutarPiston } from '../src/server/piston/client'

describe('ejecutarPiston', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends the mapped language/version and parses stdout', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ run: { stdout: 'hi\n', stderr: '', code: 0, signal: null } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const resultado = await ejecutarPiston('python', 'print("hi")', '')

    expect(resultado).toEqual({ salidaEstandar: 'hi\n', salidaError: '', codigoSalida: 0, tiempoExcedido: false })
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
    const resultado = await ejecutarPiston('python', 'while True: pass', '')
    expect(resultado.tiempoExcedido).toBe(true)
  })

  it('throws for an unsupported language', async () => {
    await expect(ejecutarPiston('cobol', 'x', '')).rejects.toThrow('Lenguaje no soportado: cobol')
  })
})
