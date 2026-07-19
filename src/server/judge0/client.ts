import { z } from 'zod'
import { MAPA_LENGUAJES } from './languages'

const respuestaJudge0Schema = z.object({
  status_id: z.number(),
  stdout: z.string().nullable().optional(),
  stderr: z.string().nullable().optional(),
  compile_output: z.string().nullable().optional(),
  exit_code: z.number().nullable().optional(),
})

export type ResultadoEjecucion = {
  salidaEstandar: string
  salidaError: string
  codigoSalida: number
  tiempoExcedido: boolean
}

const STATUS_ID_ACEPTADO = 3
const STATUS_ID_TIEMPO_EXCEDIDO = 5

function decodificarBase64(valor: string | null | undefined): string {
  return valor ? Buffer.from(valor, 'base64').toString('utf-8') : ''
}

export async function ejecutarJudge0(
  lenguaje: string,
  codigo: string,
): Promise<ResultadoEjecucion> {
  const languageId = MAPA_LENGUAJES[lenguaje]
  if (!languageId) {
    throw new Error(`Lenguaje no soportado: ${lenguaje}`)
  }

  const judge0Url = process.env.JUDGE0_URL ?? 'https://judge0-ce.p.rapidapi.com'
  const judge0ApiKey = process.env.JUDGE0_API_KEY
  const judge0ApiHost =
    process.env.JUDGE0_API_HOST ?? 'judge0-ce.p.rapidapi.com'

  // wait=true bloquea hasta tener el resultado en la misma respuesta, en vez del
  // flujo submit+poll que Judge0 recomienda para uso a gran escala. Se probó con
  // ráfagas sostenidas de 40 solicitudes concurrentes (ver benchmark de migración
  // a Judge0) sin un solo error de rate-limit, y el torneo tiene un techo de 30
  // participantes — a esa escala, wait=true es más simple y suficiente.
  const response = await fetch(
    `${judge0Url}/submissions?base64_encoded=true&wait=true&fields=status_id,stdout,stderr,compile_output,exit_code`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(judge0ApiKey
          ? {
              'X-RapidAPI-Key': judge0ApiKey,
              'X-RapidAPI-Host': judge0ApiHost,
            }
          : {}),
      },
      body: JSON.stringify({
        language_id: languageId,
        source_code: Buffer.from(codigo).toString('base64'),
        cpu_time_limit: 5,
        wall_time_limit: 10,
        memory_limit: 262144,
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`La solicitud a Judge0 falló: ${response.status}`)
  }

  const parseo = respuestaJudge0Schema.safeParse(await response.json())
  if (!parseo.success) {
    throw new Error(
      `Respuesta de Judge0 con forma inesperada: ${parseo.error.message}`,
    )
  }
  const data = parseo.data

  return {
    salidaEstandar: decodificarBase64(data.stdout),
    salidaError:
      decodificarBase64(data.stderr) || decodificarBase64(data.compile_output),
    codigoSalida:
      data.exit_code ?? (data.status_id === STATUS_ID_ACEPTADO ? 0 : 1),
    tiempoExcedido: data.status_id === STATUS_ID_TIEMPO_EXCEDIDO,
  }
}
