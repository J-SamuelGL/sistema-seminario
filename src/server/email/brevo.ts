export function construirCorreoBienvenida(input: {
  nombre: string
  correo: string
  contrasena: string
}) {
  return {
    to: [{ email: input.correo, name: input.nombre }],
    sender: {
      email: process.env.BREVO_CORREO_REMITENTE ?? '',
      name: 'Torneo de Programación',
    },
    subject: 'Tus credenciales para el Torneo de Programación',
    htmlContent: [
      `<p>Hola ${input.nombre},</p>`,
      `<p>Ya quedaste registrado para el torneo. Usa estas credenciales para iniciar sesión el día del evento:</p>`,
      `<p><strong>Usuario (correo):</strong> ${input.correo}<br/>`,
      `<strong>Contraseña:</strong> ${input.contrasena}</p>`,
      `<p>Guarda este correo, lo necesitarás para entrar al sistema.</p>`,
    ].join('\n'),
  }
}

export async function enviarCorreoBienvenida(input: {
  nombre: string
  correo: string
  contrasena: string
}): Promise<void> {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY ?? '',
    },
    body: JSON.stringify(construirCorreoBienvenida(input)),
  })

  if (!response.ok) {
    throw new Error(`La solicitud a Brevo falló: ${response.status}`)
  }
}

export async function enviarCorreoBienvenidaSeguro(input: {
  nombre: string
  correo: string
  contrasena: string
}): Promise<boolean> {
  try {
    await enviarCorreoBienvenida(input)
    return true
  } catch (err) {
    console.error('No se pudo enviar el correo de bienvenida', err)
    return false
  }
}
