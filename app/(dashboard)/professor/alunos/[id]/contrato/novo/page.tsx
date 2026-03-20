'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { maskCurrency } from '@/lib/utils'
import { Calendar, BookOpen, Clock, ChevronLeft, GraduationCap, Info } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const DIAS_SEMANA = [
  { label: 'Segunda', value: 1 },
  { label: 'Terça', value: 2 },
  { label: 'Quarta', value: 3 },
  { label: 'Quinta', value: 4 },
  { label: 'Sexta', value: 5 },
  { label: 'Sábado', value: 6 },
]

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

export default function NovoContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: alunoId } = use(params)
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [planoId, setPlanoId] = useState('1')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [horario, setHorario] = useState('18:00')
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([])
  const [valor, setValor] = useState('')
  const [livro, setLivro] = useState('')
  const [nivel, setNivel] = useState('iniciante')
  const [isOutroMaterial, setIsOutroMaterial] = useState(false)
  const [diaVencimento, setDiaVencimento] = useState('5')
  const [formaPagamento, setFormaPagamento] = useState('pix')

  useEffect(() => {
    async function loadStudent() {
      const supabase = createClient()
      const { data } = await supabase.from('profiles').select('nivel').eq('id', alunoId).single()
      if (data?.nivel) setNivel(data.nivel)
    }
    loadStudent()
  }, [alunoId])


  function toggleDia(dia: number) {

    setDiasSelecionados(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    )
  }

  async function handleCriarContrato(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const planoNum = parseInt(planoId)
      const res = await fetch('/api/contratos/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alunoId,
          planoId: planoNum,
          dataInicio,
          dataFim,
          semestre: new Date(dataInicio).getMonth() < 6 ? 'jan-jun' : 'jul-dez',
          ano: new Date(dataInicio).getFullYear(),
          diasDaSemana: diasSelecionados,
          horario,
          valor: parseFloat(valor.replace(/\D/g, '')) / 100,
          livroAtual: livro,
          nivelAtual: nivel,
          diaVencimento: parseInt(diaVencimento),
          formaPagamento,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar contrato')

      toast.success('Contrato criado com sucesso!')
      router.push(`/professor/alunos/${alunoId}`)
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-fade-in">
      <Link href={`/professor/alunos/${alunoId}`} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-black text-[10px] uppercase tracking-widest group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Voltar para Aluno
      </Link>

      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Novo Contrato Acadêmico</h1>
        <p className="text-slate-500 font-medium">Configure o plano, horários e material para o novo semestre.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-10">
        <div className="md:col-span-2 space-y-8">
          <Card className="glass-card border-none overflow-hidden hover:shadow-2xl">
            <CardHeader className="pb-8 bg-slate-50/50 border-b border-slate-100/50">
              <CardTitle className="text-xs font-black text-blue-400 flex items-center gap-2 uppercase tracking-[0.2em]">
                Configurações de Contrato
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-10">
              <form onSubmit={handleCriarContrato} className="space-y-8">
                <div className="grid sm:grid-cols-2 gap-8">
                  <div className="col-span-2 space-y-2.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Plano Financeiro</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setPlanoId('1')}
                        className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden ${planoId === '1' ? 'bg-white border-blue-600 ring-4 ring-blue-500/5' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <Clock className={`w-8 h-8 ${planoId === '1' ? 'text-blue-600' : 'text-slate-400'}`} />
                          {planoId === '1' && <Badge className="bg-blue-600 text-white">ATIVO</Badge>}
                        </div>
                        <p className="font-black text-slate-900 uppercase text-xs tracking-widest">1x por Semana</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">20 aulas / semestre</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPlanoId('2')}
                        className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden ${planoId === '2' ? 'bg-white border-blue-600 ring-4 ring-blue-500/5' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <Clock className={`w-8 h-8 ${planoId === '2' ? 'text-blue-600' : 'text-slate-400'}`} />
                          {planoId === '2' && <Badge className="bg-blue-600 text-white">ATIVO</Badge>}
                        </div>
                        <p className="font-black text-slate-900 uppercase text-xs tracking-widest">2x por Semana</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">40 aulas / semestre</p>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Nível de Inglês</Label>
                    <select 
                      className="w-full h-14 rounded-2xl bg-slate-50 border-slate-100 px-4 font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                      value={nivel}
                      onChange={e => setNivel(e.target.value)}
                    >
                      {NIVEIS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Horário das Aulas</Label>
                    <Input type="time" className="h-14 rounded-2xl bg-slate-50" value={horario} onChange={e => setHorario(e.target.value)} required />
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Data Início</Label>
                    <Input type="date" className="h-14 rounded-2xl bg-slate-50" value={dataInicio} onChange={e => setDataInicio(e.target.value)} required />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Data Fim</Label>
                    <Input type="date" className="h-14 rounded-2xl bg-slate-50" value={dataFim} onChange={e => setDataFim(e.target.value)} required />
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Investimento (TOTAL)</Label>
                    <Input 
                      className="h-14 rounded-2xl bg-blue-50 border-blue-100 text-blue-900 font-black" 
                      placeholder="R$ 0,00" 
                      value={valor} 
                      onChange={e => setValor(maskCurrency(e.target.value))} 
                      required 
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Dia de Vencimento</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="31" 
                      className="h-14 rounded-2xl bg-slate-50 font-bold" 
                      value={diaVencimento} 
                      onChange={e => setDiaVencimento(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="col-span-2 space-y-2.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Forma de Pagamento</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormaPagamento('pix')}
                        className={`flex-1 h-14 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${formaPagamento === 'pix' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}
                      >
                        PIX
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormaPagamento('cartao')}
                        className={`flex-1 h-14 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${formaPagamento === 'cartao' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}
                      >
                        Cartão
                      </button>
                    </div>
                  </div>

                  <div className="col-span-2 space-y-4">
                    <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Dias Escolhidos</Label>
                    <div className="flex flex-wrap gap-2">
                      {DIAS_SEMANA.map(dia => (
                        <button
                          key={dia.value}
                          type="button"
                          onClick={() => toggleDia(dia.value)}
                          className={`h-12 px-6 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${diasSelecionados.includes(dia.value) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}
                        >
                          {dia.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2 space-y-4">
                    <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Material Didático (Cambridge Evolve)</Label>
                    {!isOutroMaterial ? (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {EVOLVE_LEVELS.map(l => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => setLivro(l.label)}
                            className={`p-4 rounded-[2rem] border-2 text-left transition-all ${livro === l.label ? 'bg-white border-blue-600 ring-4 ring-blue-500/5' : 'bg-slate-50 border-slate-100 opacity-60'}`}
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
                          onClick={() => { setIsOutroMaterial(true); setLivro(''); }}
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
                            className="pl-12 h-14 rounded-2xl bg-slate-50" 
                            placeholder="Nome do Material" 
                            value={livro} 
                            onChange={e => setLivro(e.target.value)} 
                            autoFocus
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => { setIsOutroMaterial(false); setLivro(''); }}
                          className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline pl-1"
                        >
                          Voltar para Evolve
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={loading || diasSelecionados.length === 0} 
                    className="h-14 px-10 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto"
                  >
                    {loading ? 'PROCESSANDO...' : 'FINALIZAR CONTRATO'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-900/30">
            <GraduationCap className="w-12 h-12 text-blue-400 mb-6" />
            <h3 className="font-black text-xl tracking-tight mb-2">Contrato Acadêmico</h3>
            <p className="text-blue-100/70 text-sm font-medium leading-relaxed">
              Ao concluir este contrato, o sistema gerará automaticamente a grade de aulas, o link do Google Meet e as faturas de pagamento.
            </p>
          </div>
          
          <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 flex items-start gap-4">
            <Info className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
              Certifique-se de que os dias e horários estão corretos, pois a grade de aulas será gerada com base nestas informações.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
