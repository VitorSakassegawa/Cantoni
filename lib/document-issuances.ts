export type ExternalSignatureStatus =
  | 'internal_only'
  | 'pending_external_signature'
  | 'sent_to_provider'
  | 'signed_externally'

export function getExternalSignatureStatusLabel(status?: string | null) {
  switch (status) {
    case 'pending_external_signature':
      return 'Pendente de assinatura externa'
    case 'sent_to_provider':
      return 'Enviado ao ZapSign'
    case 'signed_externally':
      return 'Assinado externamente'
    default:
      return 'Somente no portal'
  }
}

export function getExternalSignatureStatusTone(status?: string | null) {
  switch (status) {
    case 'pending_external_signature':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'sent_to_provider':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'signed_externally':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    default:
      return 'border-slate-200 bg-slate-100 text-slate-600'
  }
}
