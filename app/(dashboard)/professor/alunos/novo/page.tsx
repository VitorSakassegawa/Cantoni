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
import { maskCPF, maskPhone, maskDate } from '@/lib/utils'
import { User, Mail, Phone, Fingerprint, Calendar, GraduationCap } from 'lucide-react'

export default function NovoAlunoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Aluno form
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cpf, setCpf] = useState('')
  const [birthDateDisplay, setBirthDateDisplay] = useState('')

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
    if (cleanPhone.length > 0 && cleanPhone.length < 10) {
      setError('O WhatsApp deve ter pelo menos 10 dígitos (DDD + número)')
      setLoading(false)
      return
    }

    const cleanCPF = cpf.replace(/\D/g, '')
    if (cleanCPF.length !== 11) {
      setError('O CPF é obrigatório e deve ter exatamente 11 dígitos')
      setLoading(false)
      return
    }

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
        body: JSON.stringify({ nome, email, telefone, cpf, birthDate: isoBirthDate }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error?.includes('profiles_email_key')) throw new Error('Este e-mail já está cadastrado no sistema')
        if (data.error?.includes('profiles_pkey')) throw new Error('Este aluno já possui um perfil ativo')
        if (data.error?.includes('User already registered')) throw new Error('Este e-mail já está em uso por outro usuário')
        
        throw new Error(data.error || 'Erro ao criar aluno')
      }
      
      router.push(`/professor/alunos/${data.alunoId}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 py-1 mb-2 text-[10px] font-black uppercase tracking-widest inline-flex w-max">
            Matrícula Inicial
          </Badge>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Matricular Novo Aluno</h1>
          <p className="text-slate-500 font-medium">Cadastre os dados básicos. O contrato será feito após o teste de nivelamento.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-10">
        <div className="md:col-span-2 space-y-8">
          <Card className="border-none overflow-hidden bg-white shadow-xl shadow-slate-200/40 rounded-[2rem] hover:shadow-2xl transition-all">
            <CardHeader className="pb-8 bg-slate-50/80 border-b border-slate-100">
              <CardTitle className="text-xs font-black text-blue-400 flex items-center gap-2 uppercase tracking-[0.2em]">
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-10">
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
                        required
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
                </div>

                {error && <p className="text-red-500 text-xs font-black uppercase tracking-widest">{error}</p>}

                <div className="pt-6 flex justify-end gap-3">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="h-14 px-10 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    {loading ? 'CRIANDO PERFIL...' : 'CADASTRAR E AVANÇAR'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info/Tips */}
        <div className="space-y-6">
          <div className="bg-blue-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-900/30">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
            <GraduationCap className="w-12 h-12 text-blue-400 mb-6" />
            <h3 className="font-black text-xl tracking-tight mb-2">Novo Fluxo de Admissão</h3>
            <p className="text-blue-100/70 text-sm font-medium leading-relaxed">
              Após criar o peril do aluno, instrua-o a baixar o App PWA e realizar o <strong>Teste de Nivelamento IA</strong>. Somente depois de obter os indicadores exatos você deverá configurar o contrato.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
