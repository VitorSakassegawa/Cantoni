export const dynamic = 'force-dynamic'

import DocumentShell from '@/components/documents/DocumentShell'
import { getDocumentContext } from '@/lib/document-access'
import { buildContractSections, LEGAL_REFERENCE_LINKS } from '@/lib/documents'
import { formatCurrency, formatDateOnly } from '@/lib/utils'

export default async function ContractDocumentPage({
  params,
}: {
  params: Promise<{ contractId: string }>
}) {
  const { contractId } = await params
  const context = await getDocumentContext(Number(contractId))
  const sections = buildContractSections(context)

  return (
    <DocumentShell
      title={`Contrato #${context.contract.id}`}
      subtitle="Versao administrativa para impressao e salvamento em PDF."
      backHref="/aluno/documentos"
    >
      <div className="space-y-10 text-slate-900">
        <header className="space-y-4 border-b border-slate-200 pb-8">
          <div className="flex justify-center">
            <img
              src="/logo-cantoni.svg"
              alt="Cantoni English School"
              className="h-16 w-auto object-contain"
            />
          </div>
          <p className="text-center text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
            Cantoni English School
          </p>
          <h2 className="text-center text-3xl font-black tracking-tight">
            Instrumento Particular de Prestacao de Servicos Educacionais
          </h2>
          <p className="text-sm leading-7 text-slate-600">
            Documento gerado a partir das informacoes vigentes no portal do aluno. Para uso institucional mais amplo, recomenda-se revisao juridica especifica antes da adocao definitiva do texto.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-slate-200 p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contratante</p>
            <p className="mt-3 text-lg font-black">{context.student?.full_name || 'Aluno'}</p>
            <p className="mt-2 text-sm text-slate-600">CPF: {context.student?.cpf || 'nao informado'}</p>
            <p className="text-sm text-slate-600">E-mail: {context.student?.email || 'nao informado'}</p>
            <p className="text-sm text-slate-600">Telefone: {context.student?.phone || 'nao informado'}</p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contratado</p>
            <p className="mt-3 text-lg font-black">{context.teacher?.full_name || 'Professor responsavel'}</p>
            <p className="mt-2 text-sm text-slate-600">CPF: {context.teacher?.cpf || 'nao informado'}</p>
            <p className="text-sm text-slate-600">E-mail: {context.teacher?.email || 'nao informado'}</p>
            <p className="text-sm text-slate-600">Telefone: {context.teacher?.phone || 'nao informado'}</p>
          </div>
        </section>

        <section className="rounded-[1.5rem] bg-slate-50 p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Periodo</p>
              <p className="mt-2 text-sm font-bold">
                {formatDateOnly(context.contract.data_inicio)} - {formatDateOnly(context.contract.data_fim)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aulas</p>
              <p className="mt-2 text-sm font-bold">{context.contract.aulas_totais} contratadas</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor global</p>
              <p className="mt-2 text-sm font-bold">{formatCurrency(Number(context.contract.valor || 0))}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Forma</p>
              <p className="mt-2 text-sm font-bold capitalize">{context.contract.forma_pagamento || 'a combinar'}</p>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          {sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <h3 className="text-lg font-black tracking-tight">{section.title}</h3>
              <p className="text-sm leading-7 text-slate-700">{section.body}</p>
            </div>
          ))}
        </section>

        {context.addenda.length > 0 && (
          <section className="space-y-4 border-t border-slate-200 pt-8">
            <h3 className="text-lg font-black tracking-tight">Historico de aditivos</h3>
            <div className="space-y-3">
              {context.addenda.map((entry: any) => (
                <div key={entry.id} className="rounded-[1.25rem] border border-slate-200 p-4">
                  <p className="text-sm font-black text-slate-900">
                    Aditivo #{entry.id} - novo saldo {formatCurrency(Number(entry.new_open_value || 0))}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Reorganizacao de {entry.previous_open_installments}x para {entry.new_open_installments}x, com primeira parcela em {formatDateOnly(entry.first_due_date)}.
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="space-y-6 border-t border-slate-200 pt-8">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comprovante institucional</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Documento</p>
                <p className="mt-2 text-sm font-bold">Contrato administrativo</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contrato vinculado</p>
                <p className="mt-2 text-sm font-bold">#{context.contract.id}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Periodo</p>
                <p className="mt-2 text-sm font-bold">{formatDateOnly(context.contract.data_inicio)} - {formatDateOnly(context.contract.data_fim)}</p>
              </div>
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Base juridica informativa</p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>Transparencia e informacao adequada ao consumidor, incluindo dever de clareza da oferta e das clausulas contratuais.</li>
            <li>Boa-fe objetiva, probidade e interpretacao favoravel ao aderente em clausulas ambiguas.</li>
          </ul>
          <div className="flex flex-wrap gap-3">
            {LEGAL_REFERENCE_LINKS.map((reference) => (
              <a key={reference.href} href={reference.href} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 underline underline-offset-4">
                {reference.label}
              </a>
            ))}
          </div>
          <div className="pt-8">
            <p className="mx-auto w-full max-w-sm border-t border-slate-400 pt-3 text-center text-sm font-bold text-slate-700">
              {context.teacher?.full_name || 'Professor responsavel'}
            </p>
            <p className="mt-2 text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              Cantoni English School
            </p>
          </div>
        </footer>
      </div>
    </DocumentShell>
  )
}
