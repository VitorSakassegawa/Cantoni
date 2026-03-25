export const dynamic = 'force-dynamic'

import DocumentShell from '@/components/documents/DocumentShell'
import { getDocumentContext } from '@/lib/document-access'
import { buildEnrollmentDeclaration } from '@/lib/documents'

const LEGAL_TEACHER_NAME = 'Gabriel de Oliveira Cantoni'

export default async function EnrollmentDeclarationPage({
  params,
}: {
  params: Promise<{ contractId: string }>
}) {
  const { contractId } = await params
  const context = await getDocumentContext(Number(contractId))
  const declaration = buildEnrollmentDeclaration(context)

  return (
    <DocumentShell
      title="Declaração de Matrícula"
      subtitle="Documento pronto para impressão e salvamento em PDF."
      backHref="/aluno/documentos"
    >
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
          <h2 className="text-3xl font-black tracking-tight">{declaration.title}</h2>
        </header>

        <section className="space-y-8">
          <p className="text-lg leading-9 text-slate-700">{declaration.body}</p>
          <p className="text-base leading-8 text-slate-600">{declaration.complementary}</p>
        </section>

        <section className="rounded-[1.5rem] bg-slate-50 p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emitente</p>
          <p className="mt-2 text-lg font-black">{LEGAL_TEACHER_NAME}</p>
          <p className="text-sm text-slate-600">CPF: {context.teacher?.cpf || 'não informado'}</p>
          <p className="text-sm text-slate-600">E-mail: {context.teacher?.email || 'não informado'}</p>
        </section>

        <footer className="space-y-6 border-t border-slate-200 pt-10">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comprovante institucional</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Documento</p>
                <p className="mt-2 text-sm font-bold">Declaração de Matrícula</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contrato vinculado</p>
                <p className="mt-2 text-sm font-bold">#{context.contract.id}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emissão</p>
                <p className="mt-2 text-sm font-bold">{declaration.issueDate}</p>
              </div>
            </div>
          </div>
          <p className="text-right text-sm text-slate-600">
            {context.teacher?.city || 'Guarulhos/SP'}, {declaration.issueDate}
          </p>
          <div className="mt-16">
            <p className="mx-auto w-full max-w-sm border-t border-slate-400 pt-3 text-center text-sm font-bold text-slate-700">
              {LEGAL_TEACHER_NAME}
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
