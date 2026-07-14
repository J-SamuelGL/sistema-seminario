import { MAPA_LENGUAJES } from './languages'

export type ResultadoPiston = {
  salidaEstandar: string
  salidaError: string
  codigoSalida: number
  tiempoExcedido: boolean
}

export async function ejecutarPiston(
  lenguaje: string,
  nombreArchivo: string,
  codigo: string,
): Promise<ResultadoPiston> {
  const mapeo = MAPA_LENGUAJES[lenguaje]
  if (!mapeo) {
    throw new Error(`Lenguaje no soportado: ${lenguaje}`)
  }

  const pistonUrl = process.env.PISTON_URL ?? 'http://localhost:2000'
  const response = await fetch(`${pistonUrl}/api/v2/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: mapeo.language,
      version: mapeo.version,
      files: [{ name: nombreArchivo, content: codigo }],
      run_timeout: 5000,
      compile_timeout: 10000,
      run_memory_limit: 268435456,
      compile_memory_limit: 268435456,
    }),
  })

  if (!response.ok) {
    throw new Error(`La solicitud a Piston falló: ${response.status}`)
  }

  const data = await response.json()
  const run = data.run
  return {
    salidaEstandar: run.stdout ?? '',
    salidaError: run.stderr ?? '',
    codigoSalida: run.code ?? 1,
    tiempoExcedido: run.signal === 'SIGKILL',
  }
}
