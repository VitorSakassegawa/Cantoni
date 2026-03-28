import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'

export type ActivitySeverity = 'info' | 'warning' | 'success'

type ActivityMetadataValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ActivityMetadata
  | ActivityMetadataValue[]

export type ActivityMetadata = {
  [key: string]: ActivityMetadataValue
}

export interface ActivityLogEntry {
  actorUserId?: string | null
  targetUserId?: string | null
  contractId?: number | null
  lessonId?: number | null
  paymentId?: number | null
  eventType: string
  title: string
  description: string
  severity?: ActivitySeverity
  metadata?: ActivityMetadata
}

export async function logActivity(entry: ActivityLogEntry) {
  const serviceSupabase = await createServiceClient()
  const { error } = await serviceSupabase.from('activity_logs').insert({
    actor_user_id: entry.actorUserId ?? null,
    target_user_id: entry.targetUserId ?? null,
    contract_id: entry.contractId ?? null,
    lesson_id: entry.lessonId ?? null,
    payment_id: entry.paymentId ?? null,
    event_type: entry.eventType,
    title: entry.title,
    description: entry.description,
    severity: entry.severity ?? 'info',
    metadata: entry.metadata ?? {},
  })

  if (error) {
    throw error
  }
}

export async function logActivityBestEffort(entry: ActivityLogEntry) {
  try {
    await logActivity(entry)
  } catch (error) {
    console.error('Activity log write failed:', error)
  }
}
