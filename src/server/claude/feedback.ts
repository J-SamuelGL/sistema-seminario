import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export function construirPromptComentario(input: {
  tituloProblema: string
  descripcionProblema: string
  codigo: string
  veredicto: string
  salidaError: string
}): string {
  return [
    `Problema: ${input.tituloProblema}`,
    input.descripcionProblema,
    '',
    'Código enviado por el participante:',
    '```',
    input.codigo,
    '```',
    '',
    `Veredicto del juez automático: ${input.veredicto}`,
    input.salidaError ? `Salida de error:\n${input.salidaError}` : '',
    '',
    input.veredicto === 'aceptado'
      ? 'La solución es correcta. Da un comentario breve (2-3 frases) sobre el estilo o eficiencia del código.'
      : 'La solución no pasó. Da una pista breve (2-3 frases) sobre qué pudo haber fallado, sin escribir el código corregido ni la solución completa.',
    '',
    'Formatea tu respuesta en markdown estándar: un solo backtick para código inline y',
    'triple backtick con nombre de lenguaje para bloques de varias líneas, sin anidar un',
    'backtick adicional alrededor de un bloque ya delimitado con triple backtick.',
  ].join('\n')
}

export async function generarComentarioEnvio(input: {
  tituloProblema: string
  descripcionProblema: string
  codigo: string
  veredicto: string
  salidaError: string
}): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    messages: [{ role: 'user', content: construirPromptComentario(input) }],
  })
  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}
