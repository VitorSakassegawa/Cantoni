import { getExternalSignatureStatusLabel, getExternalSignatureStatusTone } from '@/lib/document-issuances'

export default function ExternalSignatureStatusBadge({
  status,
}: {
  status?: string | null
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${getExternalSignatureStatusTone(status)}`}
    >
      {getExternalSignatureStatusLabel(status)}
    </span>
  )
}
