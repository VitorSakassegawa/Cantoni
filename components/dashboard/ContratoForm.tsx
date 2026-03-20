'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Calendar, BookOpen, Clock, Info, Percent, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { calculateContractSpecs } from '@/lib/utils/contract-logic'
import { maskCurrency } from '@/lib/utils'

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
  { value: 'preparatorio', label: 'Preparatório' },
]

interface ContratoFormProps {
  alunoId: string
  defaultNivel?: string
  onSuccess?: () => void
}

export default function ContratoForm({ alunoId, defaultNivel, onSuccess }: ContratoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Fields
  const [tipoContrato, setTipoContrato] = useState('semestral')
  const [planoId, setPlanoId] = useState('1')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [horario, setHorario] = useState('18:00')
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([])
  const [valor, setValor] = useState('')
  const [aulasTotais, setAulasTotais] = useState('20')
  const [bonusAulas, setBonusAulas] = useState(0)
  
  const [descontoValor, setDescontoValor] = useState('')
  const [descontoPercentual, setDescontoPercentual] = useState('')
  
  const [livro, setLivro] = useState('')
  const [nivel, setNivel] = useState(defaultNivel || 'iniciante')
  const [diaVencimento, setDiaVencimento] = useState('5')
  const [formaPagamento, setFormaPagamento] = useState('pix')

  // Auto-calculation
  useEffect(() => {
    if (dataInicio && diasSelecionados.length > 0) {
      try {
        const start = new Date(dataInicio + 'T12:00:00')
        const specs = calculateContractSpecs(start, parseInt(planoId), diasSelecionados)
        
        setDataFim(specs.endDate.toISOString().split('T')[0])
        setAulasTotais(specs.totalLessons.toString())
        setBonusAulas(specs.bonusLessons)

        // Apply discounts
        const dValor = parseFloat(descontoValor.replace(/\D/g, '') || '0') / 100
        const dPerc = parseFloat(descontoPercentual || '0')
        
        let finalValue = specs.totalValue
        if (dPerc > 0) finalValue = finalValue * (1 - dPerc / 100)
        if (dValor > 0) finalValue = finalValue - dValor

        setValor(maskCurrency((finalValue * 100).toString()))
      } catch (e) {
        console.error('Calculation error:', e)
      }
    }
  }, [dataInicio, planoId, diasSelecionados, tipoContrato, descontoValor, descontoPercentual])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/contratos/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alunoId,
          planoId: parseInt(planoId),
          dataInicio,
          dataFim,
          semestre: new Date(dataInicio).getMonth() <= 6 ? 'jan-jul' : 'aug-dez',
          ano: new Date(dataInicio).getFullYear(),
          diasDaSemana: diasSelecionados,
          horario,
          valor: parseFloat(valor.replace(/\D/g, '')) / 100,
          livroAtual: livro,
          nivelAtual: nivel,
          aulasTotais: parseInt(aulasTotais),
          diaVencimento: parseInt(diaVencimento),
          formaPagamento,
          tipoContrato,
          descontoValor: parseFloat(descontoValor.replace(/\D/g, '') || '0') / 100,
          descontoPercentual: parseFloat(descontoPercentual || '0'),
        }),
      })

      if (!res.ok) throw new Error('Erro ao criar contrato')
      
      toast.success('Contrato criado com sucesso!')
      if (onSuccess) onSuccess()
      else router.push(`/professor/alunos/${alunoId}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <Card className="glass-card border-none overflow-hidden hover:shadow-2xl transition-all">
        <div className="lms-gradient h-2" />
        <CardHeader className="p-8 pb-4">
          <CardTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Calendar className="w-5 h-5" /></div>
            Configuração do Novo Contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-10">
          
          {/* Section 1: Tipo e Plano */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Tipo de Contrato</Label>
              <Select value={tipoContrato} onChange={e => setTipoContrato(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold">
                <option value="semestral">Semestral Padrão</option>
                <option value="ad-hoc">Ad-hoc (Hora/Aula)</option>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Plano (Aulas Semanais)</Label>
              <Select value={planoId} onChange={e => setPlanoId(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold">
                <option value="1">VIP 1x por semana</option>
                <option value="2">VIP 2x por semana</option>
              </Select>
            </div>
          </div>

          <div className="h-px bg-slate-50" />

          {/* Section 2: Horários e Datas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Data de Início</Label>
              <Input 
                type="date" 
                className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold" 
                value={dataInicio} 
                onChange={e => setDataInicio(e.target.value)} 
                required
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Data de Término</Label>
              <Input 
                type="date" 
                className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold" 
                value={dataFim} 
                onChange={e => setDataFim(e.target.value)} 
                required
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Horário Base</Label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  type="time" 
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 pl-11 font-bold" 
                  value={horario} 
                  onChange={e => setHorario(e.target.value)} 
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Dias da Semana</Label>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map((dia) => (
                <button
                  key={dia.value}
                  type="button"
                  onClick={() => {
                    setDiasSelecionados(prev => 
                      prev.includes(dia.value) ? prev.filter(d => d !== dia.value) : [...prev, dia.value]
                    )
                  }}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    diasSelecionados.includes(dia.value)
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105'
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100'
                  }`}
                >
                  {dia.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-slate-50" />

          {/* Section 3: Investimento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Investimento Total (Calculado)</Label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                <Input 
                  className="h-14 rounded-2xl bg-emerald-50/50 border-emerald-100 text-emerald-700 font-black text-lg pl-11 focus:ring-emerald-500" 
                  value={valor} 
                  onChange={e => setValor(maskCurrency(e.target.value))} 
                  required
                />
              </div>
              <p className="text-[9px] text-slate-400 font-bold pl-1 uppercase tracking-widest italic">Valor baseado em {aulasTotais} aulas úteis</p>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Total de Aulas</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold" 
                  value={aulasTotais} 
                  onChange={e => setAulasTotais(e.target.value)} 
                />
                {bonusAulas > 0 && (
                  <Badge className="absolute right-3 top-1/2 -translate-y-1/2 bg-amber-100 text-amber-700 border-none text-[8px] font-black uppercase">
                    {bonusAulas} BÔNUS INCLUSAS
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Descontos */}
          {(valor && valor !== 'R$ 0,00') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-500">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-400">Desconto Fixo (R$)</Label>
                <Input 
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold" 
                  value={descontoValor} 
                  onChange={e => setDescontoValor(maskCurrency(e.target.value))} 
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-400">Desconto Percentual (%)</Label>
                <Input 
                  type="number"
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold" 
                  value={descontoPercentual} 
                  onChange={e => setDescontoPercentual(e.target.value)} 
                  placeholder="0"
                />
              </div>
            </div>
          )}

          <div className="h-px bg-slate-50" />

          {/* Section 5: Detalhes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Livro Atual</Label>
              <Input 
                className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold" 
                value={livro} 
                onChange={e => setLivro(e.target.value)} 
                placeholder="Ex: Evolve 1"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Nível Atual</Label>
              <Select value={nivel} onChange={e => setNivel(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold">
                {NIVEIS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Dia Vencimento</Label>
              <Input 
                type="number" 
                className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold" 
                value={diaVencimento} 
                onChange={e => setDiaVencimento(e.target.value)} 
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Forma Pagamento</Label>
              <Select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold">
                <option value="pix">PIX</option>
                <option value="cartao">Cartão de Crédito</option>
                <option value="dinheiro">Dinheiro</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-500" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Resumo Técnico</p>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
          Valor calculado via pro-rata dia baseado em dias úteis no semestre, excluindo feriados ANBIMA.
          Regra de 20/40 aulas semestrais considerada para cálculo do valor base.
        </p>
      </div>

      <Button 
        onClick={handleSubmit}
        className="w-full h-16 rounded-[2rem] lms-gradient text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
        disabled={loading}
      >
        {loading ? 'Processando...' : 'Finalizar Cadastro de Contrato'}
      </Button>
    </div>
  )
}
