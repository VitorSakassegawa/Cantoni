import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'
import { ChevronLeft, FileCheck2, FileText, GraduationCap } from 'lucide-react'
import ExternalSignatureGuide from '@/components/documents/ExternalSignatureGuide'
import ExternalSignatureStatusBadge from '@/components/documents/ExternalSignatureStatusBadge'
import { formatDateOnly } from '@/lib/utils'

type ContractRow = {
  id: number
  data_inicio: string
  data_fim: string
  status: string
  tipo_contrato: string
}

type IssuanceRow = {
  id: number
  contract_id: number
  kind: 'contract' | 'enrollment_declaration'
  version: number
  status: string
  created_at: string
  external_signature_status?: string | null
}

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

  const contractRows = (contratos || []) as ContractRow[]
  const contractIds = contractRows.map((contrato) => contrato.id)

  const { data: issuances } = contractIds.length
    ? await supabase
        .from('document_issuances')
        .select('id, contract_id, kind, version, status, created_at, external_signature_status')
        .in('contract_id', contractIds)
        .order('version', { ascending: false })
    : { data: [] as IssuanceRow[] }

  const latestIssuanceMap = new Map<string, IssuanceRow>()
  for (const issuance of (issuances || []) as IssuanceRow[]) {
    const key = `${issuance.contract_id}:${issuance.kind}`
    if (!latestIssuanceMap.has(key)) {
      latestIssuanceMap.set(key, issuance)
    }
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-10 pb-20">
      <Link
        href="/aluno"
        className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-blue-600"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Voltar para Dashboard
      </Link>

      <div className="space-y-3">
        <h1 className="text-4xl font-black tracking-tighter text-slate-900">Documentos</h1>
        <p className="font-medium text-slate-500">
          Acesse seus documentos acadêmicos em versão pronta para impressão e salvamento em PDF.
        </p>
      </div>

      <ExternalSignatureGuide audience="student" />

      {contractRows.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {contractRows.map((contrato) => {
            const contractIssuance = latestIssuanceMap.get(`${contrato.id}:contract`)
            const declarationIssuance = latestIssuanceMap.get(`${contrato.id}:enrollment_declaration`)

            return (
              <Card key={contrato.id} className="glass-card overflow-hidden">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-blue-500">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <FileText className="h-5 w-5" />
                    </div>
                    Contrato #{contrato.id}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-6">
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {formatDateOnly(contrato.data_inicio)} - {formatDateOnly(contrato.data_fim)}
                    </p>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {contrato.tipo_contrato} - status {contrato.status}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className="border-slate-200 text-[9px] font-black uppercase text-slate-500"
                      >
                        {contractIssuance
                          ? `Contrato emitido v${contractIssuance.version} - ${contractIssuance.status}`
                          : 'Contrato em prévia'}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-slate-200 text-[9px] font-black uppercase text-slate-500"
                      >
                        {declarationIssuance
                          ? `Declaração emitida v${declarationIssuance.version}`
                          : 'Declaração em prévia'}
                      </Badge>
                      {contractIssuance ? (
                        <ExternalSignatureStatusBadge
                          status={contractIssuance.external_signature_status}
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={
                        contractIssuance
                          ? `/documentos/emitidos/${contractIssuance.id}`
                          : `/documentos/contrato/${contrato.id}`
                      }
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700"
                    >
                      <FileCheck2 className="h-4 w-4" />
                      {contractIssuance ? 'Contrato emitido' : 'Ver prévia'}
                    </Link>
                    <Link
                      href={
                        declarationIssuance
                          ? `/documentos/emitidos/${declarationIssuance.id}`
                          : `/documentos/declaracao/${contrato.id}`
                      }
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50"
                    >
                      <GraduationCap className="h-4 w-4" />
                      {declarationIssuance ? 'Declaração emitida' : 'Ver prévia'}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-slate-400">
              Nenhum documento disponível no momento.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
