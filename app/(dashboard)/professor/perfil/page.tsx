'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { User, Mail, Phone, Fingerprint, Calendar } from 'lucide-react'

export default function ProfessorPerfilPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(data)
      setLoading(false)
    }
    loadProfile()
  }, [])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/perfil/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: profile.full_name,
          phone: profile.phone,
          cpf: profile.cpf,
          birth_date: profile.birth_date,
        }),
      })

      if (!res.ok) throw new Error('Erro ao atualizar perfil')
      toast.success('Perfil atualizado com sucesso!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-blue-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-900/10">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-blue-900 tracking-tight">Meu Perfil</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Gerenciar informações do professor</p>
        </div>
      </div>

      <Card className="glass-card border-none overflow-hidden">
        <CardHeader className="pb-2 border-b border-gray-100/50 bg-gray-50/30">
          <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2 uppercase tracking-widest">
            <div className="w-1 h-4 bg-blue-900 rounded-full" />
            Dados do Professor
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-gray-400 pl-1 tracking-widest">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-10 bg-white/50 border-gray-200 focus:border-blue-900 focus:ring-blue-900/10"
                    value={profile?.full_name || ''}
                    onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 opacity-60">
                <Label className="text-[10px] font-black uppercase text-gray-400 pl-1 tracking-widest">E-mail (não editável)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-10 bg-gray-100 border-gray-200 cursor-not-allowed"
                    value={profile?.email || ''}
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-gray-400 pl-1 tracking-widest">CPF (opcional)</Label>
                <div className="relative">
                  <Fingerprint className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-10 bg-white/50 border-gray-200"
                    placeholder="000.000.000-00"
                    value={profile?.cpf || ''}
                    onChange={e => setProfile({ ...profile, cpf: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-gray-400 pl-1 tracking-widest">WhatsApp / Celular</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-10 bg-white/50 border-gray-200"
                    placeholder="(00) 00000-0000"
                    value={profile?.phone || ''}
                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-900 text-white hover:bg-blue-800 font-bold px-8 shadow-lg shadow-blue-900/10 active:scale-95 transition-all"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
