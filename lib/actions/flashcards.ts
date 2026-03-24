'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { registerStudentActivity } from '@/lib/streak'

/**
 * SuperMemo-2 (SM-2) Algorithm simplified
 * q: quality of response (0-5)
 */
function calculateNextSRS(
  q: number, 
  prevInterval: number, 
  prevRepetitions: number, 
  prevEaseFactor: number
) {
  let interval = 0
  let repetitions = prevRepetitions
  let easeFactor = prevEaseFactor

  if (q >= 3) {
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(prevInterval * easeFactor)
    }
    repetitions++
  } else {
    repetitions = 0
    interval = 1
  }

  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  if (easeFactor < 1.3) easeFactor = 1.3

  return { interval, repetitions, easeFactor }
}

export async function addFlashcard(word: string, translation: string, example?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('flashcards').insert({
    aluno_id: user.id,
    word,
    translation,
    example,
    next_review: new Date().toISOString()
  })

  if (error) throw error
  await registerStudentActivity(user.id)
  revalidatePath('/aluno')
  revalidatePath('/aluno/flashcards')
  return { success: true }
}

export async function updateFlashcardReview(id: string, quality: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: card, error: fetchError } = await supabase
    .from('flashcards')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !card) throw new Error('Flashcard not found')

  const { interval, repetitions, easeFactor } = calculateNextSRS(
    quality,
    card.interval,
    card.repetitions,
    Number(card.ease_factor)
  )

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)

  const { error: updateError } = await supabase
    .from('flashcards')
    .update({
      interval,
      repetitions,
      ease_factor: easeFactor,
      next_review: nextReview.toISOString()
    })
    .eq('id', id)

  if (updateError) throw updateError

  await registerStudentActivity(user.id)
  revalidatePath('/aluno')
  revalidatePath('/aluno/flashcards')
  return { success: true }
}
