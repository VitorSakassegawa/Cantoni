import Link from 'next/link'
import DocumentPrintButton from '@/components/documents/DocumentPrintButton'

export default function DocumentShell({
  title,
  subtitle,
  backHref = '/aluno/documentos',
  children,
}: {
  title: string
  subtitle: string
  backHref?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="mx-auto max-w-4xl px-6 py-8 print:max-w-none print:px-0 print:py-0">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
          <div className="space-y-2">
            <Link href={backHref} className="text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-blue-600">
              Voltar
            </Link>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900">{title}</h1>
            <p className="text-sm font-medium text-slate-500">{subtitle}</p>
          </div>
          <DocumentPrintButton />
        </div>
        <article className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-2xl shadow-slate-200/60 print:rounded-none print:border-0 print:p-0 print:shadow-none">
          {children}
        </article>
      </div>
    </div>
  )
}
