export function grupoDeCategoria(
  categoria: 'invitado' | 'junior' | 'senior',
): 'invitado_junior' | 'senior' {
  return categoria === 'senior' ? 'senior' : 'invitado_junior'
}
