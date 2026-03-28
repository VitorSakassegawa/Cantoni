'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { maskCPF, maskDate, maskPhone } from '@/lib/utils'
import { toast } from 'sonner'
import { AlertCircle, Calendar, Fingerprint, Mail, Phone, User } from 'lucide-react'

type ProfessorProfile = {
  id: string
  role?: string | null
  full_name?: string | null
  email?: string | null
  phone?: string | null
  cpf?: string | null
  birth_date?: string | null
}

export default function ProfessorPerfilPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<ProfessorProfile | null>(null)
  const [birthDateDisplay, setBirthDateDisplay] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('As senhas nao coincidem.')
      return
    }
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setUpdatingPassword(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        toast.error(`Erro ao atualizar senha: ${error.message}`)
      } else {
        toast.success('Senha atualizada com sucesso!')
        setNewPassword('')
        setConfirmPassword('')
      }
    } finally {
      setUpdatingPassword(false)
    }
  }

  useEffect(() => {
    async function loadProfile() {
      const response = await fetch('/api/perfil')
      if (!response.ok) {
        setLoading(false)
        return
      }

      const data = (await response.json()) as ProfessorProfile

      setProfile(data ?? null)
      if (data?.birth_date) {
        const [y, m, d] = data.birth_date.split('-')
        setBirthDateDisplay(`${d}/${m}/${y}`)
      }
      setLoading(false)
    }

    void loadProfile()
  }, [])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    let isoBirthDate = null
    if (birthDateDisplay.length === 10) {
      const [d, m, y] = birthDateDisplay.split('/')
      isoBirthDate = `${y}-${m}-${d}`
    }

    try {
      const res = await fetch('/api/perfil/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: profile?.full_name,
          phone: profile?.phone,
          cpf: profile?.cpf,
          birth_date: isoBirthDate,
        }),
      })

      if (!res.ok) throw new Error('Erro ao atualizar perfil')
      toast.success('Perfil atualizado com sucesso!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar perfil')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-20 animate-fade-in">
      <div className="flex flex-col md:flex-row items-center gap-8 pb-10 border-b border-blue-100/50">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
          <div className="relative w-32 h-32 rounded-[2.5rem] lms-gradient flex items-center justify-center text-white text-5xl font-black shadow-2xl shadow-blue-500/20">
            {profile?.full_name?.charAt(0)}
          </div>
        </div>
        <div className="text-center md:text-left space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">{profile?.full_name}</h1>
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            <Badge className="bg-blue-900 text-white border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">{profile?.role}</Badge>
            <Badge variant="outline" className="border-blue-100 text-blue-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-blue-50/50">ID: {profile?.id?.slice(0, 8)}</Badge>
          </div>
        </div>
      </div>

      <Card className="glass-card border-none overflow-hidden hover:translate-y-0 hover:shadow-2xl">
        <CardHeader className="pb-6 bg-slate-50/50 border-b border-slate-100/50">
          <CardTitle className="text-xs font-black text-blue-400 flex items-center gap-2 uppercase tracking-[0.2em]">
            Configuracoes Profissionais
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-10">
          <form onSubmit={handleUpdate} className="space-y-10">
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Nome Completo</Label>
                <div className="relative group/input">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900" value={profile?.full_name || ''} onChange={(e) => setProfile((current) => ({ ...(current || { id: '' }), full_name: e.target.value }))} required />
                </div>
              </div>

              <div className="space-y-2.5 opacity-60">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">E-mail de Trabalho</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                  <Input className="pl-12 h-14 rounded-2xl bg-slate-100 border-slate-100 cursor-not-allowed font-bold text-slate-500" value={profile?.email || ''} disabled />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">CPF (Opcional)</Label>
                <div className="relative group/input">
                  <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900" placeholder="000.000.000-00" value={profile?.cpf || ''} onChange={(e) => setProfile((current) => ({ ...(current || { id: '' }), cpf: maskCPF(e.target.value) }))} />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">WhatsApp de Contato</Label>
                <div className="relative group/input">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900" placeholder="(00) 00000-0000" value={profile?.phone || ''} onChange={(e) => setProfile((current) => ({ ...(current || { id: '' }), phone: maskPhone(e.target.value) }))} />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Data de Nascimento</Label>
                <div className="relative group/input">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input type="text" className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900" placeholder="DD/MM/AAAA" value={birthDateDisplay} onChange={(e) => setBirthDateDisplay(maskDate(e.target.value))} />
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end items-center gap-6">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest max-w-[200px] text-right">
                Suas informacoes profissionais sao usadas para comunicacao com alunos.
              </span>
              <Button type="submit" disabled={saving} className="h-14 px-10 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                {saving ? 'PROCESSANDO...' : 'SALVAR ALTERACOES'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-8 flex items-start gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="font-black text-blue-900 text-sm uppercase tracking-tight">Dica do Professor</p>
          <p className="text-xs text-blue-800/70 font-medium leading-relaxed">
            Mantenha seu WhatsApp atualizado para facilitar o envio de lembretes e links de aulas para seus alunos.
          </p>
        </div>
      </div>

      <Card className="glass-card border-none overflow-hidden hover:translate-y-0 hover:shadow-2xl">
        <CardHeader className="pb-6 bg-slate-50/50 border-b border-slate-100/50">
          <CardTitle className="text-xs font-black text-blue-400 flex items-center gap-2 uppercase tracking-[0.2em]">Seguranca</CardTitle>
        </CardHeader>
        <CardContent className="pt-10">
          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Nova Senha</Label>
                <div className="relative">
                  <Input type="password" className="h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900 px-4" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimo 6 caracteres" minLength={6} required />
                </div>
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input type="password" className="h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900 px-4" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" minLength={6} required />
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={updatingPassword} className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest shadow-md transition-all disabled:opacity-50">
                {updatingPassword ? 'ALTERANDO...' : 'ALTERAR SENHA'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
