export type CheckinResult =
  | { status: 'checked_in'; userName: string }
  | { status: 'already_checked_in'; userName: string }
  | { status: 'not_found' }

export function buildCheckinResult(
  user: { name: string; checkedInAt: Date | null } | null,
): CheckinResult {
  if (!user) return { status: 'not_found' }
  if (user.checkedInAt)
    return { status: 'already_checked_in', userName: user.name }
  return { status: 'checked_in', userName: user.name }
}
