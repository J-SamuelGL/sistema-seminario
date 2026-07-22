import type { Categoria, Grupo } from '../../shared/dominio'

export function grupoDeCategoria(categoria: Categoria): Grupo {
  return categoria === 'senior' ? 'senior' : 'invitado_junior'
}
