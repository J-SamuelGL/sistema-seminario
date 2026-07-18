import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ejecutarJudge0 } from '../src/server/judge0/client'

function base64(texto: string): string {
  return Buffer.from(texto).toString('base64')
}

describe('ejecutarJudge0', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('manda el código en base64 con el language_id mapeado y decodifica la salida', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status_id: 3,
        stdout: base64('hi\n'),
        stderr: base64(''),
        compile_output: null,
        exit_code: 0,
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const resultado = await ejecutarJudge0('python', 'print("hi")')

    expect(resultado).toEqual({
      salidaEstandar: 'hi\n',
      salidaError: '',
      codigoSalida: 0,
      tiempoExcedido: false,
    })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/submissions')
    expect(url).toContain('base64_encoded=true')
    expect(url).toContain('wait=true')
    const body = JSON.parse(options.body)
    expect(body.language_id).toBe(92)
    expect(body.source_code).toBe(base64('print("hi")'))
  })

  it('marca tiempoExcedido cuando Judge0 reporta status_id 5', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status_id: 5,
          stdout: null,
          stderr: null,
          compile_output: null,
          exit_code: null,
        }),
      }),
    )
    const resultado = await ejecutarJudge0('python', 'while True: pass')
    expect(resultado.tiempoExcedido).toBe(true)
  })

  it('usa compile_output como salidaError cuando la compilación falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status_id: 6,
          stdout: null,
          stderr: null,
          compile_output: base64('error: cannot find symbol'),
          exit_code: null,
        }),
      }),
    )
    const resultado = await ejecutarJudge0('java', 'esto no compila')
    expect(resultado.salidaError).toBe('error: cannot find symbol')
    expect(resultado.codigoSalida).not.toBe(0)
    expect(resultado.tiempoExcedido).toBe(false)
  })

  it('throws para un lenguaje no soportado', async () => {
    await expect(ejecutarJudge0('cobol', 'x')).rejects.toThrow(
      'Lenguaje no soportado: cobol',
    )
  })
})
