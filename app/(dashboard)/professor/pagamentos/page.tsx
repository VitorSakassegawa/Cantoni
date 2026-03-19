import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import GerarCobrancaBtn from '@/components/dashboard/GerarCobrancaBtn'
import Link from 'next/link'

export default async function PagamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'professor') redirect('/aluno')

  const { data: pagamentos } = await supabase
    .from('pagamentos')
    .select('*, contratos(aluno_id, profiles(full_name, email))')
    .order('data_vencimento')

  const atrasados = pagamentos?.filter(p => p.status === 'atrasado') || []
  const pendentes = pagamentos?.filter(p => p.status === 'pendente') || []
  const pagos = pagamentos?.filter(p => p.status === 'pago') || []

  const totalReceber = [...atrasados, ...pendentes].reduce((acc, p) => acc + p.valor, 0)
  const totalRecebido = pagos.reduce((acc, p) => acc + p.valor, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-blue-900">Pagamentos</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-red-600">{atrasados.length}</p>
            <p className="text-sm text-gray-500">Atrasados</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(atrasados.reduce((a, p) => a + p.valor, 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-yellow-600">{pendentes.length}</p>
            <p className="text-sm text-gray-500">Pendentes</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(pendentes.reduce((a, p) => a + p.valor, 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRecebido)}</p>
            <p className="text-sm text-gray-500">Recebido ({pagos.length} pagamentos)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Todos os Pagamentos</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-2 font-medium">Aluno</th>
                  <th className="text-left py-2 font-medium">Parcela</th>
                  <th className="text-left py-2 font-medium">Valor</th>
                  <th className="text-left py-2 font-medium">Vencimento</th>
                  <th className="text-left py-2 font-medium">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pagamentos?.map((p: any) => (
                  <tr key={p.id} className={p.status === 'atrasado' ? 'bg-red-50' : ''}>
                    <td className="py-2">
                      <Link href={`/professor/alunos/${p.contratos?.aluno_id}`}
                        className="hover:underline text-blue-900">
                        {p.contratos?.profiles?.full_name}
                      </Link>
                    </td>
                    <td className="py-2">{p.parcela_num}/6</td>
                    <td className="py-2">{formatCurrency(p.valor)}</td>
                    <td className="py-2">{formatDate(p.data_vencimento)}</td>
                    <td className="py-2">
                      <Badge variant={
                        p.status === 'pago' ? 'success' :
                        p.status === 'atrasado' ? 'destructive' :
                        'warning'
                      }>{p.status}</Badge>
                    </td>
                    <td className="py-2">
                      {p.status !== 'pago' && !p.infinitepay_invoice_id && (
                        <GerarCobrancaBtn pagamentoId={p.id} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
