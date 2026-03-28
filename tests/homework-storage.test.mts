import assert from 'node:assert/strict'
import {
  HOMEWORK_ATTACHMENT_MAX_BYTES,
  buildHomeworkAttachmentPath,
  normalizeHomeworkAttachmentReference,
  validateHomeworkAttachment,
} from '../lib/homework-storage.ts'

const builtPath = buildHomeworkAttachmentPath(42, 'exercise.FINAL.PDF')
assert.match(builtPath, /^exercises\/42-[a-f0-9-]+\.pdf$/)

assert.equal(
  normalizeHomeworkAttachmentReference('exercises/42-sample.pdf'),
  'exercises/42-sample.pdf'
)

assert.equal(
  normalizeHomeworkAttachmentReference(
    'https://example.supabase.co/storage/v1/object/public/homework-exercises/exercises/42-sample.pdf'
  ),
  'exercises/42-sample.pdf'
)

assert.equal(
  normalizeHomeworkAttachmentReference('https://external.example.com/file.pdf'),
  'https://external.example.com/file.pdf'
)

const pngFile = new File(['ok'], 'homework.png', { type: 'image/png' })
assert.doesNotThrow(() => validateHomeworkAttachment(pngFile))

const tooLargePdf = new File([new Uint8Array(HOMEWORK_ATTACHMENT_MAX_BYTES + 1)], 'big.pdf', {
  type: 'application/pdf',
})
assert.throws(
  () => validateHomeworkAttachment(tooLargePdf),
  /10 MB/
)

const unsupportedFile = new File(['malware'], 'script.exe', { type: 'application/x-msdownload' })
assert.throws(
  () => validateHomeworkAttachment(unsupportedFile),
  /Formato de arquivo não suportado/
)

console.log('homework-storage tests passed')
