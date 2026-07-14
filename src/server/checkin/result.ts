export type ResultadoIngreso =
  | { status: 'ingresado'; nombreUsuario: string }
  | { status: 'ya_ingresado'; nombreUsuario: string }
  | { status: 'no_encontrado' }

export function construirResultadoIngreso(
  user: { name: string; ingresadoEn: Date | null } | null,
): ResultadoIngreso {
  if (!user) return { status: 'no_encontrado' }
  if (user.ingresadoEn)
    return { status: 'ya_ingresado', nombreUsuario: user.name }
  return { status: 'ingresado', nombreUsuario: user.name }
}
