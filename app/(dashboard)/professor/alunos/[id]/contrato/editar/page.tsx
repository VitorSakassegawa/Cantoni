'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ChevronLeft, FileText, Calendar, GraduationCap, BookOpen, Clock, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ProfessorEditContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: aluno_id } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [contrato, setContrato] = useState<any>(null)

  useEffect(() => {
    async function loadContrato() {
      const { data } = await supabase
        .from('contratos')
        .select('*')
        .eq('aluno_id', aluno_id)
        .eq('status', 'ativo')
        .single()
      
      if (data) {
        setContrato(data)
      }
      setLoading(false)
    }
    loadContrato()
  }, [aluno_id])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/professor/contratos/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contrato),
      })

      if (!res.ok) throw new Error('Erro ao atualizar contrato')
      toast.success('Contrato atualizado com sucesso!')
      router.push(`/professor/alunos/${aluno_id}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>
  if (!contrato) return <div className="p-8 text-center text-gray-500">Nenhum contrato ativo encontrado</div>

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-20 animate-fade-in">
      <Link href={`/professor/alunos/${aluno_id}`} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-black text-[10px] uppercase tracking-widest group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Voltar para Detalhes
      </Link>

      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Editar Contrato Ativo</h1>
        <p className="text-slate-500 font-medium">Ajuste os detalhes acadêmicos e financeiros do contrato vigente.</p>
      </div>

      <Card className="glass-card border-none overflow-hidden hover:translate-y-0 hover:shadow-2xl">
        <CardHeader className="pb-6 bg-slate-50/50 border-b border-slate-100/50">
          <CardTitle className="text-xs font-black text-blue-400 flex items-center gap-2 uppercase tracking-[0.2em]">
            <FileText className="w-4 h-4" /> Detalhes do Contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-10">
          <form onSubmit={handleUpdate} className="space-y-10">
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Semestre</Label>
                <div className="relative group/input">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                    value={contrato.semestre || ''}
                    onChange={e => setContrato({ ...contrato, semestre: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Ano</Label>
                <div className="relative group/input">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input
                    type="number"
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                    value={contrato.ano || ''}
                    onChange={e => setContrato({ ...contrato, ano: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Nível Atual</Label>
                <div className="relative group/input">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                    value={contrato.nivel_atual || ''}
                    onChange={e => setContrato({ ...contrato, nivel_atual: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Livro Atual</Label>
                <div className="relative group/input">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                    value={contrato.livro_atual || ''}
                    onChange={e => setContrato({ ...contrato, libro_atual: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Horário</Label>
                <div className="relative group/input">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input
                    placeholder="ex: 19:00"
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                    value={contrato.horario || ''}
                    onChange={e => setContrato({ ...contrato, horario: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Valor Total (Matrícula)</Label>
                <div className="relative group/input">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input
                    type="number"
                    step="0.01"
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                    value={contrato.valor || ''}
                    onChange={e => setContrato({ ...contrato, valor: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="h-14 px-10 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? 'PROCESSANDO...' : 'SALVAR ALTERAÇÕES'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
