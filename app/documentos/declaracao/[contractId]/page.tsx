export const dynamic = 'force-dynamic'

import DocumentShell from '@/components/documents/DocumentShell'
import { getDocumentContext } from '@/lib/document-access'
import { buildEnrollmentDeclaration } from '@/lib/documents'

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
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Portal Acadêmico</p>
          <h2 className="text-3xl font-black tracking-tight">{declaration.title}</h2>
        </header>

        <section className="space-y-8">
          <p className="text-lg leading-9 text-slate-700">{declaration.body}</p>
          <p className="text-base leading-8 text-slate-600">{declaration.complementary}</p>
        </section>

        <section className="rounded-[1.5rem] bg-slate-50 p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emitente</p>
          <p className="mt-2 text-lg font-black">{context.teacher?.full_name || 'Professor responsável'}</p>
          <p className="text-sm text-slate-600">CPF: {context.teacher?.cpf || 'não informado'}</p>
          <p className="text-sm text-slate-600">E-mail: {context.teacher?.email || 'não informado'}</p>
        </section>

        <footer className="pt-10 text-right">
          <p className="text-sm text-slate-600">
            {context.teacher?.city || 'Guarulhos/SP'}, {declaration.issueDate}
          </p>
          <div className="mt-16">
            <p className="mx-auto w-full max-w-sm border-t border-slate-400 pt-3 text-center text-sm font-bold text-slate-700">
              {context.teacher?.full_name || 'Professor responsável'}
            </p>
          </div>
        </footer>
      </div>
    </DocumentShell>
  )
}
