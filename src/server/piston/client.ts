import { LANGUAGE_MAP } from './languages'

export type PistonResult = {
  stdout: string
  stderr: string
  exitCode: number
  timedOut: boolean
}

export async function pistonExecute(
  language: string,
  code: string,
  stdin: string,
): Promise<PistonResult> {
  const mapping = LANGUAGE_MAP[language]
  if (!mapping) {
    throw new Error(`Unsupported language: ${language}`)
  }

  const pistonUrl = process.env.PISTON_URL ?? 'http://localhost:2000'
  const response = await fetch(`${pistonUrl}/api/v2/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: mapping.language,
      version: mapping.version,
      files: [{ content: code }],
      stdin,
      run_timeout: 5000,
    }),
  })

  if (!response.ok) {
    throw new Error(`Piston request failed: ${response.status}`)
  }

  const data = await response.json()
  const run = data.run
  return {
    stdout: run.stdout ?? '',
    stderr: run.stderr ?? '',
    exitCode: run.code ?? 1,
    timedOut: run.signal === 'SIGKILL',
  }
}
