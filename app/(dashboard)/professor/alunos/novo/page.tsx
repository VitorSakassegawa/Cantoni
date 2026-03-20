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
import { User, Mail, Phone, Fingerprint, Calendar, BookOpen, Clock, CheckCircle2, ChevronRight, GraduationCap, Info, AlertCircle, ArrowRight } from 'lucide-react'
import ContratoForm from '@/components/dashboard/ContratoForm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'


const NIVEIS = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'basico', label: 'Básico' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
  { value: 'conversacao', label: 'Conversação' },
  { value: 'certificado', label: 'Preparatório' },
]


export default function NovoAlunoPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<'aluno' | 'contrato'>('aluno')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newAlunoId, setNewAlunoId] = useState('')
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)

  // Aluno form
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [nivel, setNivel] = useState('iniciante')
  const [tipoAula, setTipoAula] = useState('regular')
  const [cpf, setCpf] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthDateDisplay, setBirthDateDisplay] = useState('')


  async function handleCriarAluno(e?: React.FormEvent, mode: 'next' | 'finish' = 'next') {
    if (e) e.preventDefault()
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
      
      if (mode === 'finish') {
        router.push(`/professor/alunos/${data.alunoId}`)
      } else {
        setStep('contrato')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // handleCriarContrato is now handled by the ContratoForm component

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-fade-in">
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

                  <div className="pt-6 flex justify-end gap-3">
                    <Button 
                      type="button"
                      variant="ghost"
                      disabled={loading}
                      onClick={() => setShowFinishConfirm(true)}
                      className="h-14 px-8 rounded-2xl border-2 border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50"
                    >
                      FINALIZAR SEM CONTRATO
                    </Button>
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
                <div className="space-y-8">
                  <div className="bg-blue-50/50 rounded-[2rem] p-8 border border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest leading-none mb-1">Perfil Criado</p>
                        <h4 className="font-black text-slate-900 tracking-tight">{nome}</h4>
                      </div>
                    </div>
                    <Button variant="ghost" className="h-10 rounded-xl text-[10px] font-black uppercase text-slate-400" onClick={() => setStep('aluno')}>EDITAR PERFIL</Button>
                  </div>

                  <ContratoForm 
                    alunoId={newAlunoId} 
                    defaultNivel={nivel} 
                    onSuccess={() => router.push(`/professor/alunos/${newAlunoId}`)}
                  />
                </div>
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

      {/* Confirmation Dialog for Finishing without contract */}
      <Dialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 border-none overflow-hidden shadow-2xl bg-white/95 backdrop-blur-xl">
          <div className="bg-amber-500 h-2 w-full" />
          <div className="p-10 space-y-8">
            <DialogHeader className="space-y-4">
              <div className="w-16 h-16 rounded-[2rem] bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="w-8 h-8" />
              </div>
              <DialogTitle className="text-2xl font-black text-center text-slate-900 tracking-tighter">
                Finalizar sem Contrato?
              </DialogTitle>
              <DialogDescription className="text-center text-slate-500 font-medium leading-relaxed">
                Deseja concluir o cadastro de **{nome || 'este aluno'}** agora? 
                O aluno não terá acesso a aulas, frequências ou pagamentos até que um contrato seja vinculado ao seu perfil futuramente.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
              <Button 
                variant="ghost" 
                className="h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 flex-1" 
                onClick={() => setShowFinishConfirm(false)}
              >
                Voltar e Continuar
              </Button>
              <Button 
                className="h-14 rounded-2xl bg-blue-600 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-98 transition-all flex-[1.5] text-white" 
                onClick={() => handleCriarAluno(undefined, 'finish')} 
                disabled={loading}
              >
                {loading ? 'Finalizando...' : 'Confirmar e Finalizar'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
