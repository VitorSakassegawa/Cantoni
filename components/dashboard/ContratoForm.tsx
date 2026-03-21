'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Calendar, BookOpen, Clock, Info, Percent, DollarSign, AlertTriangle } from 'lucide-react'
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

const NIVEIS_CAMBRIDGE = [
  { value: 'a1_beginner', label: 'Beginner (Iniciante) - A1' },
  { value: 'a2_elementary', label: 'Elementary (Básico) - A2' },
  { value: 'b1_pre_intermediate', label: 'Pre-Intermediate (Pré-Int) - B1' },
  { value: 'b1_intermediate', label: 'Intermediate (Intermediário) - B1+' },
  { value: 'b2_upper_intermediate', label: 'Upper Intermediate (Pós-Int) - B2' },
  { value: 'c1_advanced', label: 'Advanced (Avançado) - C1' },
  { value: 'c2_proficiency', label: 'Proficiency (Proficiente) - C2' },
]

const OPCOES_LIVRO = [
  { value: 'evolve', label: 'Cambridge Evolve' },
  { value: 'esl_brains', label: 'ESL Brains Platform' },
  { value: 'outro', label: 'Outro (Especificar)' },
]

interface ContratoFormProps {
  alunoId: string
  defaultNivel?: string
  initialData?: any // Full contract object for editing
  onSuccess?: () => void
}

export default function ContratoForm({ alunoId, defaultNivel, initialData, onSuccess }: ContratoFormProps) {
  const isEdit = !!initialData
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Fields
  const [tipoContrato, setTipoContrato] = useState(initialData?.tipo_contrato || 'semestral')
  const [planoId, setPlanoId] = useState(initialData?.plano_id?.toString() || '1')
  const [dataInicio, setDataInicio] = useState(initialData?.data_inicio || '')
  const [dataFim, setDataFim] = useState(initialData?.data_fim || '')
  const [horario, setHorario] = useState(initialData?.horario || '18:00')
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>(initialData?.dias_da_semana || [])
  
  const [baseValue, setBaseValue] = useState(initialData?.valor || 0)
  const [valorFinalComMascara, setValorFinalComMascara] = useState(
    initialData?.valor ? maskCurrency((initialData.valor * 100).toFixed(0)) : ''
  )
  
  const [aulasTotais, setAulasTotais] = useState(initialData?.aulas_totais?.toString() || '0')
  const [bonusAulas, setBonusAulas] = useState(0)
  const [isCrossSemester, setIsCrossSemester] = useState(false)
  
  const [descontoValor, setDescontoValor] = useState(
    initialData?.desconto_valor ? maskCurrency((initialData.desconto_valor * 100).toFixed(0)) : ''
  )
  const [descontoPercentual, setDescontoPercentual] = useState(initialData?.desconto_percentual?.toString() || '')
  
  const [livroSelect, setLivroSelect] = useState('evolve')
  const [livroManual, setLivroManual] = useState('')
  const [nivel, setNivel] = useState(initialData?.nivel_atual || defaultNivel || 'a1_beginner')
  const [diaVencimento, setDiaVencimento] = useState(initialData?.dia_vencimento?.toString() || '5')
  const [formaPagamento, setFormaPagamento] = useState(initialData?.forma_pagamento || 'pix')
  const [numParcelas, setNumParcelas] = useState('6')

  // Effect to handle Evolve book logic on initial load
  useEffect(() => {
    if (initialData?.livro_atual) {
      const isEvolve = initialData.livro_atual.toLowerCase().includes('evolve')
      const isESL = initialData.livro_atual.toLowerCase().includes('esl brains')
      
      if (isEvolve) setLivroSelect('evolve')
      else if (isESL) setLivroSelect('esl_brains')
      else {
        setLivroSelect('outro')
        setLivroManual(initialData.livro_atual)
      }
    }
  }, [initialData])

  // Auto-calculation on any relevant field change
  useEffect(() => {
    if (dataInicio && diasSelecionados.length > 0) {
      try {
        const start = new Date(dataInicio + 'T12:00:00')
        const manualEnd = dataFim ? new Date(dataFim + 'T12:00:00') : undefined
        
        const specs = calculateContractSpecs(
          start, 
          parseInt(planoId), 
          diasSelecionados, 
          tipoContrato,
          manualEnd
        )
        
        if (!dataFim || tipoContrato === 'semestral') {
          setDataFim(specs.endDate.toISOString().split('T')[0])
        }
        
        setAulasTotais(specs.totalLessons.toString())
        setBonusAulas(specs.bonusLessons)
        setBaseValue(specs.totalValue)
        setIsCrossSemester(specs.isCrossSemester)

        // Initial Final Value without discounts yet
        updateFinalValue(specs.totalValue, descontoValor, descontoPercentual)
      } catch (e) {
        console.error('Calculation error:', e)
      }
    }
  }, [dataInicio, dataFim, planoId, diasSelecionados, tipoContrato])

  // Cross-feeding Logic
  const handleDescontoValorChange = (val: string) => {
    setDescontoValor(val)
    if (baseValue > 0) {
      const numericVal = parseFloat(val.replace(/\D/g, '') || '0') / 100
      const percentage = (numericVal / baseValue) * 100
      setDescontoPercentual(percentage > 0 ? percentage.toFixed(1) : '')
      updateFinalValue(baseValue, val, percentage > 0 ? percentage.toFixed(1) : '')
    }
  }

  const handleDescontoPercentualChange = (val: string) => {
    setDescontoPercentual(val)
    if (baseValue > 0) {
      const numericPerc = parseFloat(val || '0')
      const dollarValue = (baseValue * numericPerc) / 100
      const maskedDollar = maskCurrency((dollarValue * 100).toFixed(0))
      setDescontoValor(dollarValue > 0 ? maskedDollar : '')
      updateFinalValue(baseValue, dollarValue > 0 ? maskedDollar : '', val)
    }
  }

  const updateFinalValue = (base: number, dValor: string, dPerc: string) => {
    const dv = parseFloat(dValor.replace(/\D/g, '') || '0') / 100
    const dp = parseFloat(dPerc || '0')
    let finalValue = base - dv
    if (finalValue < 0) finalValue = 0
    setValorFinalComMascara(maskCurrency((finalValue * 100).toFixed(0)))
  }

  const toggleDia = (dia: number) => {
    if (tipoContrato === 'semestral') {
      const limit = parseInt(planoId)
      if (!diasSelecionados.includes(dia) && diasSelecionados.length >= limit) {
        toast.error(`O plano ${planoId}x permite apenas ${limit} dia(s) na semana.`)
        return
      }
    }
    setDiasSelecionados(prev => 
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isCrossSemester && tipoContrato === 'semestral') {
      toast.error('Contratos semestrais não podem ultrapassar o limite do semestre (Jul/Dez). Crie dois contratos separados.')
      return
    }
    if (tipoContrato === 'semestral' && diasSelecionados.length < parseInt(planoId)) {
      toast.error(`Selecione ${planoId} dia(s) para este plano.`)
      return
    }
    if (diasSelecionados.length === 0) {
      toast.error('Selecione ao menos um dia da semana.')
      return
    }

    setLoading(true)

    try {
      const finalLivro = livroSelect === 'outro' ? livroManual : OPCOES_LIVRO.find(o => o.value === livroSelect)?.label
      const payload: any = {
        alunoId,
        planoId: parseInt(planoId),
        dataInicio,
        dataFim,
        semestre: new Date(dataInicio).getMonth() <= 5 ? 'jan-jun' : 'jul-dez',
        ano: new Date(dataInicio).getFullYear(),
        diasDaSemana: diasSelecionados,
        horario,
        valor: parseFloat(valorFinalComMascara.replace(/\D/g, '')) / 100,
        livroAtual: finalLivro,
        nivelAtual: nivel,
        aulasTotais: parseInt(aulasTotais),
        diaVencimento: parseInt(diaVencimento),
        formaPagamento,
        tipoContrato,
        descontoValor: parseFloat(descontoValor.replace(/\D/g, '') || '0') / 100,
        descontoPercentual: parseFloat(descontoPercentual || '0'),
        numParcelas: parseInt(numParcelas),
      }

      if (isEdit) {
        payload.id = initialData.id
        payload.status = initialData.status
      }

      const endpoint = isEdit ? '/api/professor/contratos/update' : '/api/contratos/criar'
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `Erro ao ${isEdit ? 'atualizar' : 'criar'} contrato`)
      }
      
      toast.success(`Contrato ${isEdit ? 'atualizado' : 'criado'} com sucesso!`)
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
      {isCrossSemester && tipoContrato === 'semestral' && (
        <div className="bg-rose-50 border-2 border-rose-100 rounded-[2rem] p-8 flex items-start gap-6 animate-pulse">
          <AlertTriangle className="w-10 h-10 text-rose-500 shrink-0" />
          <div className="space-y-2">
            <h4 className="font-black text-rose-900 uppercase text-xs tracking-widest">Atenção: Limite Semestral Excedido</h4>
            <p className="text-rose-800/70 text-sm font-medium leading-relaxed">
              Planos **Semestral Padrão** devem ser limitados a um único semestre (Jan-Jul ou Ago-Dez). 
              Seu período atual atravessa essa fronteira. Por favor, ajuste a data de término ou crie dois contratos separados.
            </p>
          </div>
        </div>
      )}

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
              <Select value={tipoContrato} onChange={e => {
                setTipoContrato(e.target.value)
                if (e.target.value === 'semestral') setIsCrossSemester(false)
              }} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold">
                <option value="semestral">Semestral Padrão</option>
                <option value="ad-hoc">Personalizado (Hora/Aula)</option>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className={`text-[10px] font-black uppercase pl-1 tracking-[0.15em] ${tipoContrato === 'ad-hoc' ? 'text-slate-300' : 'text-slate-400'}`}>Plano (Periodicidade)</Label>
              <Select 
                value={planoId} 
                onChange={e => {
                  setPlanoId(e.target.value)
                  setDiasSelecionados([]) 
                }} 
                disabled={tipoContrato === 'ad-hoc'}
                className={`h-14 rounded-2xl border-slate-100 font-bold ${tipoContrato === 'ad-hoc' ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60' : 'bg-slate-50 text-slate-900'}`}
              >
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
                disabled={tipoContrato === 'semestral'}
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
            <div className="flex justify-between items-end pl-1 pr-1">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em]">
                {tipoContrato === 'semestral' ? `Escolha o(s) ${planoId} dia(s) da semana` : 'Escolha os dias da semana'}
              </Label>
              <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-200 text-slate-400">
                {diasSelecionados.length} SELECIONADOS
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map((dia) => (
                <button
                  key={dia.value}
                  type="button"
                  onClick={() => toggleDia(dia.value)}
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
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Investimento Final (Total)</Label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                <Input 
                  className="h-14 rounded-2xl bg-emerald-50 border-emerald-100 text-emerald-700 font-black text-lg pl-11 focus:ring-emerald-500" 
                  value={valorFinalComMascara} 
                  readOnly
                />
              </div>
              <p className="text-[9px] text-slate-400 font-bold pl-1 uppercase tracking-widest italic">
                {tipoContrato === 'semestral' ? 'Base Semestral' : 'Base R$ 90,00/aula'} x {aulasTotais} aulas
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Total de Aulas Planejadas</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold" 
                  value={aulasTotais} 
                  readOnly
                />
                {bonusAulas > 0 && tipoContrato === 'semestral' && (
                  <Badge className="absolute right-3 top-1/2 -translate-y-1/2 bg-amber-100 text-amber-700 border-none text-[8px] font-black uppercase">
                    {bonusAulas} BÔNUS INCLUSAS
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Descontos Cross-feeding */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-500">Desconto Fixo (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold pl-11" 
                  value={descontoValor} 
                  onChange={e => handleDescontoValorChange(maskCurrency(e.target.value))} 
                  placeholder="R$ 0,00"
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-500">Desconto Percentual (%)</Label>
              <div className="relative">
                <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  type="number"
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold pl-11" 
                  value={descontoPercentual} 
                  onChange={e => handleDescontoPercentualChange(e.target.value)} 
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-50" />

          {/* Section 5: Detalhes Acadêmicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Livro / Material de Apoio</Label>
              <Select 
                value={livroSelect} 
                onChange={e => setLivroSelect(e.target.value)} 
                className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold"
              >
                {OPCOES_LIVRO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
              {livroSelect === 'outro' && (
                <Input 
                  className="h-12 rounded-xl bg-slate-50 border-blue-100 font-medium animate-in slide-in-from-top-2" 
                  value={livroManual} 
                  onChange={e => setLivroManual(e.target.value)} 
                  placeholder="Digite o nome do material..."
                />
              )}
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Nível CEFR (Cambridge)</Label>
              <Select value={nivel} onChange={e => setNivel(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold">
                {NIVEIS_CAMBRIDGE.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Vencimento (Dia)</Label>
              <Input 
                type="number" 
                className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold" 
                value={diaVencimento} 
                onChange={e => setDiaVencimento(e.target.value)} 
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Nº de Parcelas</Label>
              <Select value={numParcelas} onChange={e => setNumParcelas(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                  <option key={n} value={n.toString()}>{n === 1 ? '1x (À vista)' : `${n}x parcelado`}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Pagamento</Label>
              <Select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold">
                <option value="pix">PIX</option>
                <option value="cartao">Cartão</option>
                <option value="dinheiro">Dinheiro</option>
              </Select>
              <p className="text-[9px] text-slate-400 font-bold pl-1 uppercase tracking-tight italic">
                O aluno poderá trocar a forma de pagamento (PIX/Cartão) no checkout final.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 space-y-4">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-500" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-900">Resumo de Regras Aplicadas</h4>
        </div>
        <ul className="grid md:grid-cols-2 gap-4">
          <li className="flex gap-3 items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
            <p className="text-[10px] text-blue-800 font-medium">Semestral: Jan-Jul / Ago-Dez. Travado por semestre.</p>
          </li>
          <li className="flex gap-3 items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
            <p className="text-[10px] text-blue-800 font-medium">Personalizado: R$ 90,00 por aula. Sem trava de data.</p>
          </li>
          <li className="flex gap-3 items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
            <p className="text-[10px] text-blue-800 font-medium">Feriados ANBIMA são pulados automaticamente.</p>
          </li>
          <li className="flex gap-3 items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
            <p className="text-[10px] text-blue-800 font-medium">Material principal e níveis alinhados ao CEFR.</p>
          </li>
        </ul>
      </div>

      <Button 
        onClick={handleSubmit}
        className="w-full h-20 rounded-[2.5rem] lms-gradient text-white font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-blue-500/30 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
        disabled={loading || (isCrossSemester && tipoContrato === 'semestral')}
      >
        {loading ? 'Processando...' : isEdit ? 'Salvar Alterações do Contrato' : 'Finalizar Registro Acadêmico'}
      </Button>
    </div>
  )
}
