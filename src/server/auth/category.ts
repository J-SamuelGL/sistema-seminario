export function assertCategoryNotSet(user: { category?: string | null }) {
  if (user.category) {
    throw new Error('Category already set')
  }
}
