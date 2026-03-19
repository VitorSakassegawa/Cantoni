'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        toast.success('Bem-vindo de volta!')
        router.push(profile?.role === 'professor' ? '/professor' : '/aluno')
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        })
        if (authError) throw authError
        
        toast.success('Conta criada com sucesso! Você já pode entrar.')
        setIsLogin(true)
      }
    } catch (err: any) {
      setError(err.message || 'Erro na autenticação.')
      toast.error(err.message || 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-blue-50/50 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#1e3a5f] text-white text-3xl font-black mb-4 shadow-xl shadow-blue-900/20 transform rotate-3 hover:rotate-0 transition-transform duration-500">
            GC
          </div>
          <h1 className="text-3xl font-black text-[#1e3a5f] tracking-tighter">Gabriel Cantoni</h1>
          <p className="text-gray-500 text-sm mt-2 font-medium uppercase tracking-widest">Aulas de Inglês Exclusivas</p>
        </div>

        <Card className="glass-card border-none shadow-2xl shadow-blue-900/5 overflow-hidden">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-bold text-gray-900">{isLogin ? 'Entrar no Portal' : 'Criar nova conta'}</CardTitle>
            <CardDescription className="text-xs font-semibold uppercase tracking-tight text-gray-400">
              {isLogin ? 'Acesse seus materiais e aulas' : 'Comece sua jornada no inglês agora'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-5">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-[10px] font-black uppercase text-gray-400 ml-1">Nome Completo</Label>
                  <Input
                    id="fullName"
                    placeholder="Seu nome"
                    className="bg-white/50 border-gray-100 rounded-xl focus:ring-[#1e3a5f] focus:border-[#1e3a5f]"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[10px] font-black uppercase text-gray-400 ml-1">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="bg-white/50 border-gray-100 rounded-xl focus:ring-[#1e3a5f] focus:border-[#1e3a5f]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[10px] font-black uppercase text-gray-400 ml-1">Senha</Label>
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
              
              {error && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-red-600 text-[10px] font-bold uppercase">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full bg-[#1e3a5f] hover:bg-[#162a45] text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]" disabled={loading}>
                {loading ? (isLogin ? 'Entrando...' : 'Criando...') : (isLogin ? 'Acessar Painel' : 'Criar Conta')}
              </Button>

              <div className="text-center pt-4 border-t border-gray-100/50">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-xs font-bold text-[#1e3a5f] hover:underline underline-offset-4"
                >
                  {isLogin ? 'Não tem conta? Crie uma agora' : 'Já tem conta? Faça o login'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
