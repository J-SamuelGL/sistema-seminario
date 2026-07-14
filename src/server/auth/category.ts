export function asegurarCategoriaNoDefinida(user: { categoria?: string | null }) {
  if (user.categoria) {
    throw new Error('La categoría ya está definida')
  }
}
