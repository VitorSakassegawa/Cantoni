import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Eye, Mail, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getEmailTemplatePreviews } from '@/lib/resend'

export const dynamic = 'force-dynamic'

export default async function EmailPreviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'professor') redirect('/aluno')

  const templates = getEmailTemplatePreviews()

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
            <Eye className="h-3 w-3" />
            Preview editorial
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900">Templates de E-mail</h1>
          <p className="max-w-3xl text-sm font-medium text-slate-500">
            Pré-visualização dos e-mails transacionais da Cantoni English School com branding, copy e hierarquia visual
            finais.
          </p>
        </div>

        <Link
          href="/professor"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 shadow-sm transition-colors hover:border-blue-200 hover:text-blue-700"
        >
          <Sparkles className="h-4 w-4" />
          Voltar ao dashboard
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <a
            key={template.slug}
            href={`#${template.slug}`}
            className="glass-card rounded-[2rem] border-none p-6 shadow-lg shadow-blue-900/5 transition-transform hover:-translate-y-1"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <Mail className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black tracking-tight text-slate-900">{template.name}</p>
                <p className="truncate text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {template.subject}
                </p>
              </div>
            </div>
            <p className="text-xs font-medium leading-relaxed text-slate-500">
              Clique para ir direto à visualização completa deste template.
            </p>
          </a>
        ))}
      </div>

      <div className="space-y-10">
        {templates.map((template) => (
          <section key={template.slug} id={template.slug} className="space-y-4 scroll-mt-24">
            <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">{template.name}</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{template.subject}</h2>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-blue-900/5">
              <iframe
                title={template.name}
                srcDoc={template.html}
                className="h-[920px] w-full bg-white"
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
