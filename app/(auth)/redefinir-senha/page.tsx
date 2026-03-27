'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Senha redefinida com sucesso!')
      router.push('/login')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Erro ao redefinir senha.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-blue-50/50 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#1e3a5f] text-white text-3xl font-black mb-4 shadow-xl shadow-blue-900/20">
            GC
          </div>
          <h1 className="text-3xl font-black text-[#1e3a5f] tracking-tighter">Cantoni English School</h1>
          <p className="text-gray-500 text-sm mt-2 font-medium uppercase tracking-widest text-[9px]">Redefinição de Senha</p>
        </div>

        <Card className="glass-card border-none shadow-2xl shadow-blue-900/5 overflow-hidden">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-bold text-gray-900">Nova Senha</CardTitle>
            <CardDescription className="text-xs font-semibold uppercase tracking-tight text-gray-400">
              Escolha uma senha forte para sua segurança
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[10px] font-black uppercase text-gray-400 ml-1">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-white/50 border-gray-100 rounded-xl focus:ring-[#1e3a5f] focus:border-[#1e3a5f]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase text-gray-400 ml-1">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="bg-white/50 border-gray-100 rounded-xl focus:ring-[#1e3a5f] focus:border-[#1e3a5f]"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-[#1e3a5f] hover:bg-[#162a45] text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Nova Senha'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}




