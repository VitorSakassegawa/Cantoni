import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { UserPlus } from 'lucide-react'

export default async function AlunosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: alunos } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'aluno')
    .order('full_name')

  const { data: contratos } = await supabase
    .from('contratos')
    .select('*, planos(*), pagamentos(*)')
    .eq('status', 'ativo')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-900">Alunos</h1>
        <Link href="/professor/alunos/novo">
          <Button size="sm">
            <UserPlus className="w-4 h-4" />
            Novo aluno
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {alunos?.map((aluno: any) => {
          const contrato = contratos?.find(c => c.aluno_id === aluno.id)
          const pagPendente = contrato?.pagamentos?.find(
            (p: any) => p.status === 'pendente' || p.status === 'atrasado'
          )
          return (
            <Card key={aluno.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-sm">
                      {aluno.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{aluno.full_name}</p>
                      <p className="text-sm text-gray-500">{aluno.email}</p>
                      {contrato && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {contrato.planos?.freq_semana}x/sem • {contrato.aulas_restantes}/{contrato.aulas_totais} aulas restantes
                          {contrato.nivel_atual && ` • ${contrato.nivel_atual}`}
                          {contrato.livro_atual && ` • ${contrato.livro_atual}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!contrato && <Badge variant="outline">Sem contrato ativo</Badge>}
                    {pagPendente && (
                      <Badge variant={pagPendente.status === 'atrasado' ? 'destructive' : 'warning'}>
                        {pagPendente.status === 'atrasado' ? 'Atrasado' : 'Pendente'}: {formatCurrency(pagPendente.valor)}
                      </Badge>
                    )}
                    {contrato && !pagPendente && <Badge variant="success">Pagamento em dia</Badge>}
                    <Link href={`/professor/alunos/${aluno.id}`}>
                      <Button variant="outline" size="sm">Detalhes</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {(!alunos || alunos.length === 0) && (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum aluno cadastrado ainda.</p>
            <Link href="/professor/alunos/novo" className="text-blue-900 hover:underline text-sm mt-2 inline-block">
              Cadastrar primeiro aluno
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function Users({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}
