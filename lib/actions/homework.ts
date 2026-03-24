'use server'

import { requireLessonAccess } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function uploadHomeworkImage(aulaId: number, file: File) {
  await requireLessonAccess(aulaId, {
    allowProfessor: true,
    allowStudentOwner: true,
  })

  const supabase = await createClient()
  const fileExt = file.name.split('.').pop()
  const fileName = `${aulaId}-${crypto.randomUUID()}.${fileExt}`
  const filePath = `exercises/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('homework-exercises')
    .upload(filePath, file)

  if (uploadError) {
    throw uploadError
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('homework-exercises').getPublicUrl(filePath)

  const { error: updateError } = await supabase
    .from('aulas')
    .update({
      homework_image_url: publicUrl,
      homework_completed: true,
    })
    .eq('id', aulaId)

  if (updateError) {
    throw updateError
  }

  return { success: true, url: publicUrl }
}

export async function updateLessonHomework(
  aulaId: number,
  data: {
    homework?: string
    has_homework?: boolean
    homework_type?: 'regular' | 'esl_brains' | 'evolve'
    homework_link?: string
    homework_due_date?: string
    meet_link?: string
    class_notes?: string
    ai_summary_sent?: boolean
  }
) {
  await requireLessonAccess(aulaId, {
    allowProfessor: true,
    allowStudentOwner: false,
  })

  const supabase = await createClient()
  const sanitizedData = {
    ...data,
    homework_due_date: data.homework_due_date === '' ? null : data.homework_due_date,
  }

  const { error } = await supabase.from('aulas').update(sanitizedData).eq('id', aulaId)

  if (error) {
    throw error
  }

  return { success: true }
}
