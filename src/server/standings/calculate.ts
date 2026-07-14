export type SubmissionRecord = {
  userId: string
  problemId: string
  status: 'pending' | 'accepted' | 'wrong_answer' | 'runtime_error' | 'timeout'
  createdAt: Date
}

export type UserRecord = {
  id: string
  name: string
  category: 'senior' | 'junior'
}

export type StandingRow = {
  userId: string
  name: string
  category: 'senior' | 'junior'
  solvedCount: number
  totalPenaltyMinutes: number
}

export function calculateStandings(
  users: UserRecord[],
  submissions: SubmissionRecord[],
  tournamentStartedAt: Date,
): StandingRow[] {
  const byUser = new Map<string, SubmissionRecord[]>()
  for (const s of submissions) {
    if (s.status === 'pending') continue
    if (!byUser.has(s.userId)) byUser.set(s.userId, [])
    byUser.get(s.userId)!.push(s)
  }

  const rows = users.map((user): StandingRow => {
    const subs = (byUser.get(user.id) ?? []).slice().sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    )
    const byProblem = new Map<string, SubmissionRecord[]>()
    for (const s of subs) {
      if (!byProblem.has(s.problemId)) byProblem.set(s.problemId, [])
      byProblem.get(s.problemId)!.push(s)
    }

    let solvedCount = 0
    let totalPenaltyMinutes = 0

    for (const [, problemSubs] of byProblem) {
      const acceptedIndex = problemSubs.findIndex((s) => s.status === 'accepted')
      if (acceptedIndex === -1) continue
      solvedCount += 1
      const acceptedSubmission = problemSubs[acceptedIndex]
      const failedAttemptsBefore = acceptedIndex
      const minutesSinceStart = Math.floor(
        (acceptedSubmission.createdAt.getTime() - tournamentStartedAt.getTime()) / 60000,
      )
      totalPenaltyMinutes += minutesSinceStart + failedAttemptsBefore * 20
    }

    return {
      userId: user.id,
      name: user.name,
      category: user.category,
      solvedCount,
      totalPenaltyMinutes,
    }
  })

  return rows.sort((a, b) => {
    if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount
    return a.totalPenaltyMinutes - b.totalPenaltyMinutes
  })
}

export function groupStandingsByCategory(rows: StandingRow[]) {
  return {
    senior: rows.filter((r) => r.category === 'senior'),
    junior: rows.filter((r) => r.category === 'junior'),
  }
}
