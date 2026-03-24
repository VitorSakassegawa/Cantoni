import { createServiceClient } from './supabase/server'
import { calculateNextStreak } from './streak-utils'

export { STUDENT_STREAK_RULES, calculateNextStreak } from './streak-utils'

export async function registerStudentActivity(studentId: string, activityDate?: string) {
  const supabase = await createServiceClient()
  const effectiveDate = activityDate || new Date().toISOString().split('T')[0]

  const { error: rpcError } = await supabase.rpc('register_student_activity_streak', {
    p_student_id: studentId,
    p_activity_date: effectiveDate,
  })

  if (!rpcError) {
    return { success: true }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('streak_count, last_activity_date')
    .eq('id', studentId)
    .single()

  if (profileError || !profile) {
    throw rpcError
  }

  const next = calculateNextStreak(profile.streak_count || 0, profile.last_activity_date, effectiveDate)
  if (!next.changed) {
    return { success: true }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      streak_count: next.streakCount,
      last_activity_date: next.lastActivityDate,
    })
    .eq('id', studentId)

  if (updateError) {
    throw updateError
  }

  return { success: true }
}
