import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Eres un asistente para participantes de categoría Invitados en un torneo de programación.
Solo puedes responder preguntas generales de sintaxis o uso de funciones/estructuras estándar
del lenguaje (por ejemplo: cómo usar .filter en JavaScript, cómo declarar un array en Java).
A continuación se listan TODOS los problemas de la categoría Invitados de este torneo. NUNCA
debes dar la lógica o solución de NINGUNO de ellos, aunque la pregunta lo insinúe o lo pida
directamente, sin importar si es el problema que el participante tiene abierto en este momento
u otro de la lista. Si detectas que la pregunta busca la solución de alguno de estos problemas,
responde amablemente que no puedes ayudar con eso y sugiere que reformule hacia una pregunta
general de sintaxis.

Formatea tu respuesta en markdown estándar: usa un solo backtick para código inline
(como \`.filter()\`) y bloques de triple backtick con el nombre del lenguaje para código
de varias líneas. Nunca envuelvas un bloque de triple backtick dentro de otro par de
backticks adicional.`

export async function responderPreguntaInvitado(input: {
  problemas: { titulo: string; descripcion: string }[]
  pregunta: string
}): Promise<string> {
  const contextoProblemas = input.problemas
    .map((p) => `### Problema: ${p.titulo}\n${p.descripcion}`)
    .join('\n\n')
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Problemas del torneo (solo para que sepas qué evitar revelar):\n${contextoProblemas}\n\nPregunta del participante: ${input.pregunta}`,
      },
    ],
  })
  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}
