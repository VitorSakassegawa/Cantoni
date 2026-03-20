'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { maskCPF, maskPhone, maskDate, maskCurrency } from '@/lib/utils'
import { User, Mail, Phone, Fingerprint, Calendar, BookOpen, Clock, CheckCircle2, ChevronRight, GraduationCap, Info } from 'lucide-react'

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

export default function NovoAlunoPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<'aluno' | 'contrato'>('aluno')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newAlunoId, setNewAlunoId] = useState('')

  // Aluno form
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [nivel, setNivel] = useState('iniciante')
  const [tipoAula, setTipoAula] = useState('regular')
  const [cpf, setCpf] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthDateDisplay, setBirthDateDisplay] = useState('')

  // Contrato form
  const [planoId, setPlanoId] = useState('1')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [horario, setHorario] = useState('18:00')
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([])
  const [valor, setValor] = useState('')
  const [livro, setLivro] = useState('')
  const [isOutroMaterial, setIsOutroMaterial] = useState(false)
  const [diaVencimento, setDiaVencimento] = useState('5')
  const [formaPagamento, setFormaPagamento] = useState('pix')

  function toggleDia(dia: number) {
    setDiasSelecionados(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    )
  }

  async function handleCriarAluno(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 1. Validation Logic
    if (!email.includes('@') || !email.includes('.')) {
      setError('Por favor, insira um e-mail válido (ex: joao@exemplo.com)')
      setLoading(false)
      return
    }

    const cleanPhone = telefone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setError('O WhatsApp deve ter pelo menos 10 dígitos (DDD + número)')
      setLoading(false)
      return
    }

    const cleanCPF = cpf.replace(/\D/g, '')
    if (cleanCPF.length > 0 && cleanCPF.length !== 11) {
      setError('O CPF deve ter exatamente 11 dígitos')
      setLoading(false)
      return
    }

    // Convert DD/MM/YYYY back to YYYY-MM-DD for validation and API
    let isoBirthDate = null
    if (birthDateDisplay.length > 0) {
      if (birthDateDisplay.length !== 10) {
        setError('A data de nascimento deve estar no formato DD/MM/AAAA')
        setLoading(false)
        return
      }

      const [dStr, mStr, yStr] = birthDateDisplay.split('/')
      const d = parseInt(dStr)
      const m = parseInt(mStr)
      const y = parseInt(yStr)

      if (m < 1 || m > 12) {
        setError('O mês de nascimento deve ser entre 01 e 12')
        setLoading(false)
        return
      }

      if (d < 1 || d > 31) {
        setError('O dia de nascimento é inválido')
        setLoading(false)
        return
      }

      if (y < 1920 || y > new Date().getFullYear()) {
        setError('O ano de nascimento é inválido')
        setLoading(false)
        return
      }

      isoBirthDate = `${yStr}-${mStr}-${dStr}`
    }

    try {
      const res = await fetch('/api/alunos/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, telefone, nivel, tipoAula, cpf, birthDate: isoBirthDate }),
      })
      const data = await res.json()

      if (!res.ok) {
        // Friendly error mapping for Database Constraints
        if (data.error?.includes('profiles_email_key')) throw new Error('Este e-mail já está cadastrado no sistema')
        if (data.error?.includes('profiles_pkey')) throw new Error('Este aluno já possui um perfil ativo')
        if (data.error?.includes('User already registered')) throw new Error('Este e-mail já está em uso por outro usuário')
        
        throw new Error(data.error || 'Erro ao criar aluno')
      }
      
      setNewAlunoId(data.alunoId)
      setStep('contrato')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
          alunoId: newAlunoId,
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

      router.push(`/professor/alunos/${newAlunoId}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">
              Matrícula
            </Badge>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <Badge className={step === 'aluno' ? "bg-blue-600 text-white border-none" : "bg-emerald-500 text-white border-none"}>
              {step === 'aluno' ? 'PASSO 1' : 'CONCLUÍDO'}
            </Badge>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Matricular Novo Aluno</h1>
          <p className="text-slate-500 font-medium">Cadastre um novo aluno e configure o contrato acadêmico.</p>
        </div>

        {/* Steps Progress */}
        <div className="flex items-center gap-4 bg-slate-100/50 p-2 rounded-2xl">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${step === 'aluno' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-emerald-500 text-white'}`}>
            {step === 'aluno' ? '1' : <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div className="w-8 h-1 bg-slate-200 rounded-full" />
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${step === 'contrato' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-400 border border-slate-200'}`}>
            2
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-10">
        <div className="md:col-span-2 space-y-8">
          <Card className="glass-card border-none overflow-hidden hover:shadow-2xl">
            <CardHeader className="pb-8 bg-slate-50/50 border-b border-slate-100/50">
              <CardTitle className="text-xs font-black text-blue-400 flex items-center gap-2 uppercase tracking-[0.2em]">
                {step === 'aluno' ? 'Informações Pessoais' : 'Configurações de Contrato'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-10">
              {step === 'aluno' ? (
                <form onSubmit={handleCriarAluno} className="space-y-8">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Nome Completo</Label>
                      <div className="relative group/input">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                        <Input
                          className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                          value={nome}
                          onChange={e => setNome(e.target.value)}
                          placeholder="Ex: João Silva"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">E-mail</Label>
                      <div className="relative group/input">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                        <Input
                          className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="joao@exemplo.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">WhatsApp</Label>
                      <div className="relative group/input">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                        <Input
                          className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                          value={telefone}
                          onChange={e => setTelefone(maskPhone(e.target.value))}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">CPF para Contrato</Label>
                      <div className="relative group/input">
                        <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                        <Input
                          className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                          value={cpf}
                          onChange={e => setCpf(maskCPF(e.target.value))}
                          placeholder="000.000.000-00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Data de Nascimento</Label>
                      <div className="relative group/input">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                        <Input
                          className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                          type="text"
                          placeholder="DD/MM/AAAA"
                          value={birthDateDisplay}
                          onChange={e => setBirthDateDisplay(maskDate(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="col-span-2 space-y-4 pt-4">
                      <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Nível de Inglês</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {NIVEIS.map(n => (
                          <button
                            key={n.value}
                            type="button"
                            onClick={() => setNivel(n.value)}
                            className={`h-14 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${nivel === n.value ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200 hover:text-blue-500'}`}
                          >
                            {n.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {error && <p className="text-red-500 text-xs font-black uppercase tracking-widest">{error}</p>}

                  <div className="pt-6 flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="h-14 px-10 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      {loading ? 'PROCESSANDO...' : 'PRÓXIMO PASSO'}
                    </Button>
                  </div>
                </form>
              ) : (
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
                      <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Data Início</Label>
                      <Input type="date" className="h-14 rounded-2xl bg-slate-50" value={dataInicio} onChange={e => setDataInicio(e.target.value)} required />
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Data Fim</Label>
                      <Input type="date" className="h-14 rounded-2xl bg-slate-50" value={dataFim} onChange={e => setDataFim(e.target.value)} required />
                    </div>

                    <div className="space-y-2.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Horário das Aulas</Label>
                      <Input type="time" className="h-14 rounded-2xl bg-slate-50" value={horario} onChange={e => setHorario(e.target.value)} required />
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Investimento (TOTAL)</Label>
                      <div className="relative group/input">
                        <Input 
                          className="h-14 rounded-2xl bg-blue-50 border-blue-100 text-blue-900 font-black" 
                          placeholder="R$ 0,00" 
                          value={valor} 
                          onChange={e => setValor(maskCurrency(e.target.value))} 
                          required 
                        />
                      </div>
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

                    <div className="space-y-2.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Forma de Pagamento</Label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFormaPagamento('pix')}
                          className={`flex-1 h-14 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${formaPagamento === 'pix' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}
                        >
                          PIX
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormaPagamento('cartao')}
                          className={`flex-1 h-14 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${formaPagamento === 'cartao' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}
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
                      
                      <div className="bg-blue-50/50 rounded-2xl p-4 flex items-start gap-4 border border-blue-100/50">
                        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-blue-800/60 font-medium leading-relaxed">
                          <strong>Evolve</strong> is a six-level American English course from Cambridge, designed to build speaking confidence through student-centered activities and real-world topics.
                        </p>
                      </div>
                    </div>
                  </div>

                  {error && <p className="text-red-500 text-xs font-black uppercase tracking-widest">{error}</p>}

                  <div className="pt-6 flex justify-between gap-4">
                    <Button type="button" variant="ghost" onClick={() => setStep('aluno')} className="h-14 px-8 rounded-2xl text-slate-400 font-black text-[10px] uppercase tracking-widest">VOLTAR</Button>
                    <Button type="submit" disabled={loading || diasSelecionados.length === 0} className="h-14 px-10 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">
                      {loading ? 'FINALIZANDO...' : 'CONCLUIR MATRÍCULA'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info/Tips */}
        <div className="space-y-6">
          <div className="bg-blue-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-900/30">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
            <GraduationCap className="w-12 h-12 text-blue-400 mb-6" />
            <h3 className="font-black text-xl tracking-tight mb-2">Dica de Sucesso</h3>
            <p className="text-blue-100/70 text-sm font-medium leading-relaxed">
              O nivelamento correto é essencial para a experiência do aluno. Se houver dúvida, marque como "Iniciante" para a primeira aula experimental.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo Financeiro</p>
              <h4 className="font-bold text-slate-900">Plano de Pagamentos</h4>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-600 font-medium">Acesso imediato à plataforma</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-600 font-medium">Geração automática de aulas</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-600 font-medium">Controle de presença no APP</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
