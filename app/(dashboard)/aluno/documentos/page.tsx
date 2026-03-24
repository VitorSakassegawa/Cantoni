import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { FileCheck2, FileText, GraduationCap, ChevronLeft } from 'lucide-react'
import { formatDateOnly } from '@/lib/utils'

export default async function AlunoDocumentosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'professor') redirect('/professor')

  const { data: contratos } = await supabase
    .from('contratos')
    .select('id, data_inicio, data_fim, status, tipo_contrato')
    .eq('aluno_id', user.id)
    .neq('status', 'cancelado')
    .order('data_inicio', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-fade-in">
      <Link href="/aluno" className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-black text-[10px] uppercase tracking-widest group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Voltar para Dashboard
      </Link>

      <div className="space-y-3">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Documentos</h1>
        <p className="text-slate-500 font-medium">
          Acesse seus documentos acadêmicos em versão pronta para impressão e salvamento em PDF.
        </p>
      </div>

      {contratos && contratos.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {contratos.map((contrato: any) => (
            <Card key={contrato.id} className="glass-card overflow-hidden">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-blue-500">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  Contrato #{contrato.id}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div>
                  <p className="text-sm font-black text-slate-900">
                    {formatDateOnly(contrato.data_inicio)} - {formatDateOnly(contrato.data_fim)}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">
                    {contrato.tipo_contrato} • status {contrato.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/documentos/contrato/${contrato.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    Ver contrato
                  </Link>
                  <Link
                    href={`/documentos/declaracao/${contrato.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50"
                  >
                    <GraduationCap className="w-4 h-4" />
                    Declaração
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-slate-400">Nenhum documento disponível no momento.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
