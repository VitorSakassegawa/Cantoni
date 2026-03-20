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
import { maskCPF, maskPhone, maskDate, formatDateOnly } from '@/lib/utils'
import { User, Mail, Phone, Fingerprint, Calendar, AlertCircle, ChevronLeft, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ProfessorEditAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [birthDateDisplay, setBirthDateDisplay] = useState('')
  const [inscricaoDateDisplay, setInscricaoDateDisplay] = useState('')

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
      
      if (data) {
        setProfile(data)
        if (data.birth_date) {
          setBirthDateDisplay(formatDateOnly(data.birth_date))
        }
        if (data.data_inscricao) {
          setInscricaoDateDisplay(formatDateOnly(data.data_inscricao))
        }
      }
      setLoading(false)
    }
    loadProfile()
  }, [id])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    
    // Convert DD/MM/YYYY back to YYYY-MM-DD
    let isoBirthDate = null
    if (birthDateDisplay && birthDateDisplay.length === 10) {
      const [d, m, y] = birthDateDisplay.split('/')
      isoBirthDate = `${y}-${m}-${d}`
    }

    let isoInscricaoDate = null
    if (inscricaoDateDisplay && inscricaoDateDisplay.length === 10) {
      const [d, m, y] = inscricaoDateDisplay.split('/')
      isoInscricaoDate = `${y}-${m}-${d}`
    }

    try {
      const res = await fetch('/api/professor/alunos/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aluno_id: id,
          full_name: profile.full_name,
          phone: profile.phone,
          cpf: profile.cpf,
          birth_date: isoBirthDate,
          data_inscricao: isoInscricaoDate,
          nivel: profile.nivel,
        }),
      })

      if (!res.ok) throw new Error('Erro ao atualizar perfil do aluno')
      toast.success('Perfil atualizado com sucesso!')
      router.push(`/professor/alunos/${id}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-20 animate-fade-in">
      <Link href={`/professor/alunos/${id}`} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-black text-[10px] uppercase tracking-widest group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Voltar para Detalhes
      </Link>

      {/* Header Section */}
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
            <Badge className="bg-blue-900 text-white border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">Aluno</Badge>
            <Badge variant="outline" className="border-blue-100 text-blue-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-blue-50/50">Editando Perfil</Badge>
          </div>
        </div>
      </div>

      <Card className="glass-card border-none overflow-hidden hover:translate-y-0 hover:shadow-2xl">
        <CardHeader className="pb-6 bg-slate-50/50 border-b border-slate-100/50">
          <CardTitle className="text-xs font-black text-blue-400 flex items-center gap-2 uppercase tracking-[0.2em]">
            Informações Cadastrais
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-10">
          <form onSubmit={handleUpdate} className="space-y-10">
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Nome Completo</Label>
                <div className="relative group/input">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                    value={profile?.full_name || ''}
                    onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Nível de Inglês</Label>
                <div className="relative group/input">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                    value={profile?.nivel || ''}
                    onChange={e => setProfile({ ...profile, nivel: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">CPF para Contrato</Label>
                <div className="relative group/input">
                  <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                    placeholder="000.000.000-00"
                    value={profile?.cpf || ''}
                    onChange={e => setProfile({ ...profile, cpf: maskCPF(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">WhatsApp Celular</Label>
                <div className="relative group/input">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                    placeholder="(00) 00000-0000"
                    value={profile?.phone || ''}
                    onChange={e => setProfile({ ...profile, phone: maskPhone(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Data de Nascimento</Label>
                <div className="relative group/input">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input
                    type="text"
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                    placeholder="DD/MM/AAAA"
                    value={birthDateDisplay}
                    onChange={e => setBirthDateDisplay(maskDate(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-[0.15em]">Data de Matrícula</Label>
                <div className="relative group/input">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-blue-500 transition-colors" />
                  <Input
                    type="text"
                    className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                    placeholder="DD/MM/AAAA"
                    value={inscricaoDateDisplay}
                    onChange={e => setInscricaoDateDisplay(maskDate(e.target.value))}
                  />
                </div>
              </div>
            </div>


            <div className="pt-6 flex justify-end items-center gap-6">
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

      <div className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-8 flex items-start gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="font-black text-blue-900 text-sm uppercase tracking-tight">Gestão do Aluno</p>
          <p className="text-xs text-blue-800/70 font-medium leading-relaxed">
            Como professor, você tem autonomia para atualizar os dados cadastrais e o nível do aluno. 
            Isso garante que contratos e certificados sejam emitidos corretamente.
          </p>
        </div>
      </div>
    </div>
  )
}
