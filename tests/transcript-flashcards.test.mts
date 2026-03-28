import assert from 'node:assert/strict'
import { buildFlashcardSyncPlan } from '../lib/flashcards-sync.ts'
import { truncateTranscriptForAI } from '../lib/transcript-utils.ts'

const transcript = [
  'Lesson warm-up and context.',
  'Discussion about culture and communication.',
  'Teacher explains corrections.',
  'Homework: finish the worksheet before next class.',
].join('\n\n')

const truncated = truncateTranscriptForAI(transcript.repeat(500), 160)

assert.match(truncated, /\[Transcript truncated for AI processing/)
assert.match(truncated, /Homework: finish the worksheet before next class\./)
assert.match(truncated, /Lesson warm-up and context\./)

const syncPlan = buildFlashcardSyncPlan(
  ['Body Language', 'Politeness'],
  [
    {
      word: 'body language',
      translation: 'linguagem corporal',
      example: 'Body language can vary across cultures.',
    },
    {
      word: ' Dress code ',
      translation: 'código de vestimenta',
      example: 'The restaurant had a strict dress code.',
    },
    {
      word: 'dress code',
      translation: 'código de vestimenta',
      example: 'Duplicate incoming entry should be skipped.',
    },
    {
      word: 'Language barrier',
      translation: 'barreira linguística',
      example: '',
    },
  ]
)

assert.deepEqual(syncPlan, {
  toInsert: [
    {
      word: 'Dress code',
      translation: 'código de vestimenta',
      example: 'The restaurant had a strict dress code.',
    },
    {
      word: 'Language barrier',
      translation: 'barreira linguística',
      example: '',
    },
  ],
  skipped: 2,
})

console.log('transcript-flashcards tests passed')
