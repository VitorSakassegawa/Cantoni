export const dynamic = 'force-dynamic'

import DocumentShell from '@/components/documents/DocumentShell'
import DocumentAcceptanceForm from '@/components/documents/DocumentAcceptanceForm'
import ExternalSignatureGuide from '@/components/documents/ExternalSignatureGuide'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDateOnly, formatDateTime } from '@/lib/utils'

function getStatusLabel(status: string) {
  switch (status) {
    case 'accepted':
      return 'Aceito digitalmente'
    case 'superseded':
      return 'Versão superada'
    default:
      return 'Emitido'
  }
}

function getStatusTone(status: string) {
  switch (status) {
    case 'accepted':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'superseded':
      return 'border-slate-200 bg-slate-100 text-slate-600'
    default:
      return 'border-blue-200 bg-blue-50 text-blue-700'
  }
}

export default async function IssuedDocumentPage({
  params,
}: {
  params: Promise<{ issuanceId: string }>
}) {
  const { issuanceId } = await params
  const parsedIssuanceId = Number.parseInt(issuanceId, 10)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: viewer } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: issuance } = await supabase.from('document_issuances').select('*').eq('id', parsedIssuanceId).single()

  if (!issuance) {
    redirect('/aluno/documentos')
  }

  const isProfessor = viewer?.role === 'professor'
  if (!isProfessor && issuance.student_id !== user.id) {
    redirect('/aluno')
  }

  const payload = issuance.payload || {}
  const backHref = isProfessor ? '/professor' : '/aluno/documentos'
  const issuanceCode = `CES-${String(issuance.id).padStart(6, '0')}-V${issuance.version}`
  const statusLabel = getStatusLabel(issuance.status)
  const statusTone = getStatusTone(issuance.status)

  return (
    <DocumentShell
      title={issuance.title}
      subtitle={`Versão ${issuance.version} - status ${issuance.status}`}
      backHref={backHref}
    >
      {issuance.kind === 'contract' ? (
        <div className="space-y-10 text-slate-900">
          <header className="document-header space-y-4 border-b border-slate-200 pb-8">
            <div className="flex flex-col items-center gap-4">
              <img
                src="/logo-cantoni.svg"
                alt="Cantoni English School"
                className="h-16 w-auto object-contain"
              />
              <div className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] ${statusTone}`}>
                {statusLabel}
              </div>
            </div>
            <p className="text-center text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
              Cantoni English School
            </p>
            <h2 className="text-center text-3xl font-black tracking-tight">
              {payload.title || issuance.title}
            </h2>
            <p className="text-sm leading-7 text-slate-600">
              Documento emitido em {formatDateTime(issuance.created_at)}. Esta versão permanece congelada mesmo que o cadastro seja alterado depois.
            </p>
          </header>

          <section className="document-section rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comprovante de emissão</p>
                <p className="mt-1 text-lg font-black text-slate-900">{issuanceCode}</p>
              </div>
              <div className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] ${statusTone}`}>
                {statusLabel}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Versão</p>
                <p className="mt-2 text-sm font-bold">v{issuance.version}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
                <p className="mt-2 text-sm font-bold">{statusLabel}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Número de emissão</p>
                <p className="mt-2 text-sm font-bold">{issuanceCode}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hash de integridade</p>
                <p className="mt-2 break-all font-mono text-xs text-slate-700">{issuance.content_hash || 'não disponível'}</p>
              </div>
            </div>
          </section>

          <section className="document-section grid gap-6 md:grid-cols-2">
            <div className="document-card rounded-[1.5rem] border border-slate-200 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contratante</p>
              <p className="mt-3 text-lg font-black">{payload.student?.fullName}</p>
              <p className="mt-2 text-sm text-slate-600">CPF: {payload.student?.cpf}</p>
              <p className="text-sm text-slate-600">E-mail: {payload.student?.email}</p>
              <p className="text-sm text-slate-600">Telefone: {payload.student?.phone}</p>
            </div>
            <div className="document-card rounded-[1.5rem] border border-slate-200 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contratado</p>
              <p className="mt-3 text-lg font-black">{payload.teacher?.fullName}</p>
              <p className="mt-2 text-sm text-slate-600">CPF: {payload.teacher?.cpf}</p>
              <p className="text-sm text-slate-600">E-mail: {payload.teacher?.email}</p>
              <p className="text-sm text-slate-600">Telefone: {payload.teacher?.phone}</p>
            </div>
          </section>

          <section className="document-section rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quadro-resumo do contrato</p>
              <p className="mt-2 text-sm text-slate-600">
                Esta versão emitida consolida os dados financeiros e acadêmicos que estavam vigentes no momento da emissão.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Período</p>
                <p className="mt-2 text-sm font-bold">
                  {formatDateOnly(payload.summary?.startDate)} – {formatDateOnly(payload.summary?.endDate)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aulas</p>
                <p className="mt-2 text-sm font-bold">{payload.summary?.lessons} contratadas</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor global</p>
                <p className="mt-2 text-sm font-bold">{formatCurrency(Number(payload.summary?.totalValue || 0))}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Forma</p>
                <p className="mt-2 text-sm font-bold">
                  {payload.summary?.paymentMethod || 'a combinar'} ({payload.summary?.installmentCount || 1} parcela{(payload.summary?.installmentCount || 1) > 1 ? 's' : ''})
                </p>
              </div>
            </div>
          </section>

          <section className="document-section space-y-8">
            {(payload.sections || []).map((section: any) => (
              <div key={section.title} className="document-card space-y-3">
                <h3 className="text-lg font-black tracking-tight">{section.title}</h3>
                {section.body?.split('\n').map((paragraph: string, index: number) => (
                  <p key={`${section.title}-body-${index}`} className="text-sm leading-7 text-slate-700">
                    {paragraph}
                  </p>
                ))}
                {section.items?.length ? (
                  <div className="space-y-3 pt-1">
                    {section.items.map((item: string) => (
                      <p key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700">
                        {item}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </section>

          {payload.addenda?.length > 0 && (
            <section className="document-section space-y-4 border-t border-slate-200 pt-8">
              <h3 className="text-lg font-black tracking-tight">Historico de aditivos considerados</h3>
              <div className="space-y-3">
              {payload.addenda.map((entry: any) => (
                <div key={entry.id} className="document-card rounded-[1.25rem] border border-slate-200 p-4">
                  <p className="text-sm font-black text-slate-900">
                    Aditivo #{entry.id} – novo saldo {formatCurrency(Number(entry.newOpenValue || 0))}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Reorganização de {entry.previousOpenInstallments}x para {entry.newOpenInstallments}x, com primeira parcela em {formatDateOnly(entry.firstDueDate)}.
                  </p>
                </div>
              ))}
            </div>
          </section>
          )}

          {issuance.requires_acceptance && issuance.status !== 'accepted' && !isProfessor && (
            <DocumentAcceptanceForm
              issuanceId={issuance.id}
              defaultName={viewer?.full_name || ''}
              terms={payload.acceptanceTerms || []}
            />
          )}

          {issuance.status === 'accepted' && (
            <div className="document-card rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-6 print:hidden">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Aceite registrado</p>
              <p className="mt-2 text-sm font-medium text-emerald-900/80">
                Aceito por {issuance.accepted_name || 'aluno'} em {formatDateTime(issuance.accepted_at)}.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Versão aceita</p>
                  <p className="mt-1 text-sm font-bold text-emerald-900">v{issuance.accepted_version || issuance.version}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">IP</p>
                  <p className="mt-1 break-all text-xs font-medium text-emerald-900/80">{issuance.acceptance_ip || 'não informado'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">User-Agent</p>
                  <p className="mt-1 break-all text-xs font-medium text-emerald-900/80">{issuance.acceptance_user_agent || 'não informado'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="print:hidden">
            <ExternalSignatureGuide audience={isProfessor ? 'professor' : 'student'} compact />
          </div>

          <footer className="document-section space-y-6 border-t border-slate-200 pt-8">
            <p className="text-sm text-slate-600">
              {payload.teacher?.city || 'Guarulhos/SP'}, _____ de __________________ de {new Date(issuance.created_at).getFullYear()}.
            </p>
            <div className="document-signature grid gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contratante</p>
                <p className="w-full border-t border-slate-400 pt-3 text-center text-sm font-bold text-slate-700">
                  {payload.student?.fullName || 'Aluno'}
                </p>
                <p className="text-center text-xs font-medium text-slate-500">
                  CPF: {payload.student?.cpf || 'não informado'}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contratado</p>
                <p className="w-full border-t border-slate-400 pt-3 text-center text-sm font-bold text-slate-700">
                  {payload.teacher?.fullName || 'Professor responsável'}
                </p>
                <p className="text-center text-xs font-medium text-slate-500">
                  CPF: {payload.teacher?.cpf || 'não informado'}
                </p>
              </div>
            </div>
          </footer>
        </div>
      ) : (
        <div className="space-y-12 text-slate-900">
          <header className="space-y-4 border-b border-slate-200 pb-8 text-center">
            <div className="flex justify-center">
              <img
                src="/logo-cantoni.svg"
                alt="Cantoni English School"
                className="h-16 w-auto object-contain"
              />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Cantoni English School</p>
            <h2 className="text-3xl font-black tracking-tight">{payload.title || issuance.title}</h2>
          </header>

          <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comprovante de emissão</p>
                <p className="mt-1 text-lg font-black text-slate-900">{issuanceCode}</p>
              </div>
              <div className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] ${statusTone}`}>
                {statusLabel}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Versão</p>
                <p className="mt-2 text-sm font-bold">v{issuance.version}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
                <p className="mt-2 text-sm font-bold">{statusLabel}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Número de emissão</p>
                <p className="mt-2 text-sm font-bold">{issuanceCode}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hash de integridade</p>
                <p className="mt-2 break-all font-mono text-xs text-slate-700">{issuance.content_hash || 'não disponível'}</p>
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <p className="text-lg leading-9 text-slate-700">{payload.body}</p>
            <p className="text-base leading-8 text-slate-600">{payload.complementary}</p>
          </section>
          <section className="rounded-[1.5rem] bg-slate-50 p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emitente</p>
            <p className="mt-2 text-lg font-black">{payload.teacher?.fullName}</p>
            <p className="text-sm text-slate-600">CPF: {payload.teacher?.cpf}</p>
            <p className="text-sm text-slate-600">E-mail: {payload.teacher?.email}</p>
          </section>
          <footer className="pt-10 text-right">
            <p className="text-sm text-slate-600">
              {payload.teacher?.city || 'Guarulhos/SP'}, {payload.issueDate}
            </p>
          </footer>
        </div>
      )}
    </DocumentShell>
  )
}
