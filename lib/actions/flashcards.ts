'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { registerStudentActivityBestEffort } from '@/lib/streak'
import { getXpReward } from '@/lib/gamification'
import { calculateNextSRS } from '@/lib/flashcards-srs'

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
  await registerStudentActivityBestEffort(user.id)
  revalidatePath('/aluno')
  revalidatePath('/aluno/flashcards')
  return { success: true, xpAwarded: getXpReward('flashcardAdd') }
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

  const { interval, repetitions, easeFactor, lapsed } = calculateNextSRS(
    quality,
    card.interval,
    card.repetitions,
    card.ease_factor
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

  await registerStudentActivityBestEffort(user.id)
  revalidatePath('/aluno')
  revalidatePath('/aluno/flashcards')
  // Reward retention, not raw volume: a lapse earns less than a successful recall.
  const baseXp = getXpReward('flashcardReview')
  const xpAwarded = lapsed ? Math.ceil(baseXp / 2) : baseXp
  return { success: true, xpAwarded }
}
