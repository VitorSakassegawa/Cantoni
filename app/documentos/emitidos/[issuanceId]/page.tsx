export const dynamic = 'force-dynamic'

import DocumentShell from '@/components/documents/DocumentShell'
import DocumentAcceptanceForm from '@/components/documents/DocumentAcceptanceForm'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDateOnly, formatDateTime } from '@/lib/utils'

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
  const { data: issuance } = await supabase
    .from('document_issuances')
    .select('*')
    .eq('id', parsedIssuanceId)
    .single()

  if (!issuance) {
    redirect('/aluno/documentos')
  }

  const isProfessor = viewer?.role === 'professor'
  if (!isProfessor && issuance.student_id !== user.id) {
    redirect('/aluno')
  }

  const payload = issuance.payload || {}
  const backHref = isProfessor ? '/professor' : '/aluno/documentos'

  return (
    <DocumentShell
      title={issuance.title}
      subtitle={`Versão ${issuance.version} • status ${issuance.status}`}
      backHref={backHref}
    >
      {issuance.kind === 'contract' ? (
        <div className="space-y-10 text-slate-900">
          <header className="space-y-4 border-b border-slate-200 pb-8">
            <p className="text-center text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
              Contrato Emitido
            </p>
            <h2 className="text-center text-3xl font-black tracking-tight">
              {payload.title || issuance.title}
            </h2>
            <p className="text-sm leading-7 text-slate-600">
              Documento emitido em {formatDateTime(issuance.created_at)}. Esta versão permanece congelada mesmo que o cadastro seja alterado depois.
            </p>
          </header>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-200 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contratante</p>
              <p className="mt-3 text-lg font-black">{payload.student?.fullName}</p>
              <p className="mt-2 text-sm text-slate-600">CPF: {payload.student?.cpf}</p>
              <p className="text-sm text-slate-600">E-mail: {payload.student?.email}</p>
              <p className="text-sm text-slate-600">Telefone: {payload.student?.phone}</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contratado</p>
              <p className="mt-3 text-lg font-black">{payload.teacher?.fullName}</p>
              <p className="mt-2 text-sm text-slate-600">CPF: {payload.teacher?.cpf}</p>
              <p className="text-sm text-slate-600">E-mail: {payload.teacher?.email}</p>
              <p className="text-sm text-slate-600">Telefone: {payload.teacher?.phone}</p>
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-slate-50 p-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Período</p>
                <p className="mt-2 text-sm font-bold">{formatDateOnly(payload.summary?.startDate)} - {formatDateOnly(payload.summary?.endDate)}</p>
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
                <p className="mt-2 text-sm font-bold capitalize">{payload.summary?.paymentMethod || 'a combinar'}</p>
              </div>
            </div>
          </section>

          <section className="space-y-8">
            {(payload.sections || []).map((section: any) => (
              <div key={section.title} className="space-y-3">
                <h3 className="text-lg font-black tracking-tight">{section.title}</h3>
                <p className="text-sm leading-7 text-slate-700">{section.body}</p>
              </div>
            ))}
          </section>

          {payload.addenda?.length > 0 && (
            <section className="space-y-4 border-t border-slate-200 pt-8">
              <h3 className="text-lg font-black tracking-tight">Histórico de aditivos considerados</h3>
              <div className="space-y-3">
                {payload.addenda.map((entry: any) => (
                  <div key={entry.id} className="rounded-[1.25rem] border border-slate-200 p-4">
                    <p className="text-sm font-black text-slate-900">
                      Aditivo #{entry.id} • novo saldo {formatCurrency(Number(entry.newOpenValue || 0))}
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
            <DocumentAcceptanceForm issuanceId={issuance.id} defaultName={viewer?.full_name || ''} />
          )}

          {issuance.status === 'accepted' && (
            <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-6 print:hidden">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Aceite registrado</p>
              <p className="mt-2 text-sm font-medium text-emerald-900/80">
                Aceito por {issuance.accepted_name || 'aluno'} em {formatDateTime(issuance.accepted_at)}.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-12 text-slate-900">
          <header className="space-y-4 border-b border-slate-200 pb-8 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Documento Emitido</p>
            <h2 className="text-3xl font-black tracking-tight">{payload.title || issuance.title}</h2>
          </header>
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
