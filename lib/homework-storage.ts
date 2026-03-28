import type { TimelineAula } from '@/lib/dashboard-types'

export const HOMEWORK_BUCKET = 'homework-exercises'
export const HOMEWORK_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024

const ALLOWED_HOMEWORK_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

function sanitizeFileExtension(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() || 'bin'
  return extension.replace(/[^a-z0-9]/g, '') || 'bin'
}

export function validateHomeworkAttachment(file: File) {
  if (!ALLOWED_HOMEWORK_MIME_TYPES.has(file.type)) {
    throw new Error('Formato de arquivo não suportado. Envie JPG, PNG, WEBP ou PDF.')
  }

  if (file.size > HOMEWORK_ATTACHMENT_MAX_BYTES) {
    throw new Error('O arquivo excede o limite de 10 MB para anexos de homework.')
  }
}

export function buildHomeworkAttachmentPath(aulaId: number, fileName: string) {
  const fileExt = sanitizeFileExtension(fileName)
  return `exercises/${aulaId}-${crypto.randomUUID()}.${fileExt}`
}

export function normalizeHomeworkAttachmentReference(reference?: string | null) {
  const value = (reference || '').trim()
  if (!value) {
    return null
  }

  if (!/^https?:\/\//i.test(value)) {
    return value
  }

  const bucketMarker = `/${HOMEWORK_BUCKET}/`
  const markerIndex = value.indexOf(bucketMarker)
  if (markerIndex === -1) {
    return value
  }

  return value.slice(markerIndex + bucketMarker.length)
}

type SignedUrlStorageClient = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number
      ) => Promise<{ data: { signedUrl?: string | null } | null; error: Error | null }>
    }
  }
}

export async function resolveHomeworkAttachmentUrl(
  supabase: SignedUrlStorageClient,
  reference?: string | null,
  expiresInSeconds = 60 * 60
) {
  const normalizedReference = normalizeHomeworkAttachmentReference(reference)
  if (!normalizedReference) {
    return null
  }

  if (/^https?:\/\//i.test(normalizedReference)) {
    return normalizedReference
  }

  const { data, error } = await supabase.storage
    .from(HOMEWORK_BUCKET)
    .createSignedUrl(normalizedReference, expiresInSeconds)

  if (error) {
    throw error
  }

  return data?.signedUrl || null
}

export async function hydrateHomeworkAttachmentUrls(
  supabase: SignedUrlStorageClient,
  aulas: TimelineAula[] | null | undefined,
  expiresInSeconds = 60 * 60
) {
  const lessonList = aulas || []

  return Promise.all(
    lessonList.map(async (lesson) => ({
      ...lesson,
      homework_image_url: await resolveHomeworkAttachmentUrl(
        supabase,
        lesson.homework_image_url,
        expiresInSeconds
      ),
    }))
  )
}
