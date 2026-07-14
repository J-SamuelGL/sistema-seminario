import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export function buildFeedbackPrompt(input: {
  problemTitle: string
  problemDescription: string
  code: string
  verdict: string
  stderr: string
}): string {
  return [
    `Problema: ${input.problemTitle}`,
    input.problemDescription,
    '',
    'Código enviado por el participante:',
    '```',
    input.code,
    '```',
    '',
    `Veredicto del juez automático: ${input.verdict}`,
    input.stderr ? `Salida de error:\n${input.stderr}` : '',
    '',
    input.verdict === 'accepted'
      ? 'La solución es correcta. Da un comentario breve (2-3 frases) sobre el estilo o eficiencia del código.'
      : 'La solución no pasó. Da una pista breve (2-3 frases) sobre qué pudo haber fallado, sin escribir el código corregido ni la solución completa.',
  ].join('\n')
}

export async function generateSubmissionFeedback(input: {
  problemTitle: string
  problemDescription: string
  code: string
  verdict: string
  stderr: string
}): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    messages: [{ role: 'user', content: buildFeedbackPrompt(input) }],
  })
  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}
