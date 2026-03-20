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
import { ChevronLeft, FileText, Calendar, GraduationCap, BookOpen, Clock, DollarSign, Info, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { maskCurrency, formatCurrency } from '@/lib/utils'

const NIVEIS = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'basico', label: 'Básico' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
  { value: 'conversacao', label: 'Conversação' },
  { value: 'certificado', label: 'Preparatório' },
]

const EVOLVE_LEVELS = [
  { id: 'evolve-1', label: 'Evolve Level 1', cefr: 'A1', desc: 'Beginner basics: greetings, family, numbers.' },
  { id: 'evolve-2', label: 'Evolve Level 2', cefr: 'A2', desc: 'Elementary: everyday topics; immersive speaking lessons.' },
  { id: 'evolve-3', label: 'Evolve Level 3', cefr: 'B1', desc: 'Intermediate: communication skills, grammar, vocabulary.' },
  { id: 'evolve-4', label: 'Evolve Level 4', cefr: 'B1+', desc: 'Upper intermediate: decision-making tasks.' },
  { id: 'evolve-5', label: 'Evolve Level 5', cefr: 'B2', desc: 'Advanced intermediate: complex discussions.' },
  { id: 'evolve-6', label: 'Evolve Level 6', cefr: 'C1', desc: 'Proficient: nuanced expression; advanced speaking.' },
]

export default function ProfessorEditContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: aluno_id } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [contrato, setContrato] = useState<any>(null)
  const [isOutroMaterial, setIsOutroMaterial] = useState(false)

  useEffect(() => {
    async function loadContrato() {
      const { data } = await supabase
        .from('contratos')
        .select('*')
        .eq('aluno_id', aluno_id)
        .eq('status', 'ativo')
        .single()
      
      if (data) {
        // Formatar valor para o estado
        const valorFormatado = maskCurrency((data.valor * 100).toString())
        setContrato({ 
          ...data, 
          valor: valorFormatado,
          dia_vencimento: data.dia_vencimento || 5,
          forma_pagamento: data.forma_pagamento || 'pix'
        })
        
        // Verificar se o livro está na lista do Evolve
        const isEvolve = EVOLVE_LEVELS.some(l => l.label === data.livro_atual)
        setIsOutroMaterial(!isEvolve && !!data.livro_atual)
      }
      setLoading(false)
    }
    loadContrato()
  }, [aluno_id])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      // Limpar o valor antes de enviar (remover R$, pontos e espaços, manter apenas dígitos)
      const cleanValor = parseFloat(contrato.valor.replace(/\D/g, '')) / 100

      const res = await fetch('/api/professor/contratos/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contrato,
          valor: cleanValor
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao atualizar contrato')
      }
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
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-fade-in">
      <Link href={`/professor/alunos/${aluno_id}`} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-black text-[10px] uppercase tracking-widest group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Voltar para Detalhes
      </Link>

      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Editar Contrato Ativo</h1>
        <p className="text-slate-500 font-medium">Ajuste os detalhes acadêmicos e financeiros do contrato vigente.</p>
      </div>

      <Card className="glass-card border-none overflow-hidden hover:shadow-2xl transition-all duration-500">
        <CardHeader className="pb-8 bg-slate-50/50 border-b border-slate-100/50">
          <CardTitle className="text-xs font-black text-blue-400 flex items-center gap-2 uppercase tracking-[0.2em]">
            <FileText className="w-4 h-4" /> Detalhes do Contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-10">
          <form onSubmit={handleUpdate} className="space-y-12">
            <div className="grid gap-8 sm:grid-cols-2">
              {/* Semestre e Ano */}
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Semestre</Label>
                <div className="relative group/input">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-900"
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
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-900"
                    value={contrato.ano || ''}
                    onChange={e => setContrato({ ...contrato, ano: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              {/* Horário e Valor */}
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Horário</Label>
                <div className="relative group/input">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input
                    placeholder="ex: 19:00"
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-900"
                    value={contrato.horario || ''}
                    onChange={e => setContrato({ ...contrato, horario: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Investimento (TOTAL)</Label>
                <div className="relative group/input">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input
                    className="pl-12 h-14 rounded-2xl bg-blue-50 border-blue-100 text-blue-900 font-black focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                    value={contrato.valor || ''}
                    onChange={e => setContrato({ ...contrato, valor: maskCurrency(e.target.value) })}
                  />
                </div>
              </div>

              {/* Vencimento e Forma de Pagamento */}
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Dia de Vencimento</Label>
                <div className="relative group/input">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-900"
                    value={contrato.dia_vencimento || ''}
                    onChange={e => setContrato({ ...contrato, dia_vencimento: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Forma de Pagamento</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setContrato({ ...contrato, forma_pagamento: 'pix' })}
                    className={`flex-1 h-14 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${contrato.forma_pagamento === 'pix' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}
                  >
                    PIX
                  </button>
                  <button
                    type="button"
                    onClick={() => setContrato({ ...contrato, forma_pagamento: 'cartao' })}
                    className={`flex-1 h-14 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${contrato.forma_pagamento === 'cartao' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}
                  >
                    Cartão
                  </button>
                </div>
              </div>

              {/* Nível Atual - Grid de Botões */}
              <div className="col-span-2 space-y-4">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Nível Atual</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {NIVEIS.map(n => (
                    <button
                      key={n.value}
                      type="button"
                      onClick={() => setContrato({ ...contrato, nivel_atual: n.value })}
                      className={`h-14 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${contrato.nivel_atual === n.value ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200 hover:text-blue-500'}`}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Material Didático - Grid de Botões */}
              <div className="col-span-2 space-y-4">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Material Didático (Cambridge Evolve)</Label>
                {!isOutroMaterial ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {EVOLVE_LEVELS.map(l => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setContrato({ ...contrato, livro_atual: l.label })}
                        className={`p-4 rounded-[2rem] border-2 text-left transition-all ${contrato.livro_atual === l.label ? 'bg-white border-blue-600 ring-4 ring-blue-500/5' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-black text-slate-900 uppercase text-[10px] tracking-widest">{l.label}</p>
                          <Badge className="bg-blue-100 text-blue-600 border-none text-[8px]">{l.cefr}</Badge>
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium leading-tight">{l.desc}</p>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setIsOutroMaterial(true); setContrato({ ...contrato, livro_atual: '' }); }}
                      className="p-4 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center font-black text-[10px] uppercase tracking-widest"
                    >
                      Outro Material
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative group/input">
                      <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input 
                        className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:border-blue-500 transition-all font-bold" 
                        placeholder="Nome do Material" 
                        value={contrato.livro_atual || ''} 
                        onChange={e => setContrato({ ...contrato, livro_atual: e.target.value })} 
                        autoFocus
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { setIsOutroMaterial(false); setContrato({ ...contrato, livro_atual: '' }); }}
                      className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline pl-1"
                    >
                      Voltar para Evolve
                    </button>
                  </div>
                )}
                
                <div className="bg-blue-50/50 rounded-2xl p-4 flex items-start gap-4 border border-blue-100/50">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-blue-800/60 font-medium leading-relaxed">
                    <strong>Evolve</strong> is a six-level American English course from Cambridge, designed to build speaking confidence through student-centered activities and real-world topics.
                  </p>
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
