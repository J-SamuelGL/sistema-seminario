export function canAskQuestion(user: {
  category: string
  aiQuestionsUsed: number
}): boolean {
  return user.category === 'junior' && user.aiQuestionsUsed < 2
}
