'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (authMode === 'login') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()

        toast.success('Bem-vindo de volta!')
        router.push(profile?.role === 'professor' ? '/professor' : '/aluno')
      } else if (authMode === 'signup') {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        })
        if (authError) throw authError

        toast.success('Conta criada com sucesso! Você já pode entrar.')
        setAuthMode('login')
      }
    } catch (err: any) {
      setError(err.message || 'Erro na autenticação.')
      toast.error(err.message || 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/redefinir-senha`,
      })
      if (error) throw error
      setSuccessMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.')
      toast.success('Link de recuperação enviado!')
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/50 p-4">
      <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-blue-100/30 blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-blue-200/20 blur-3xl animate-pulse [animation-delay:1s]" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1e3a5f] text-3xl font-black text-white shadow-xl shadow-blue-900/20 transition-transform duration-500 hover:rotate-0 rotate-3">
            GC
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-[#1e3a5f]">Gabriel Cantoni</h1>
          <p className="mt-2 text-sm font-medium uppercase tracking-widest text-gray-500">Aulas de Inglês Exclusivas</p>
        </div>

        <Card className="glass-card overflow-hidden border-none shadow-2xl shadow-blue-900/5">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-xl font-bold text-gray-900">
              {authMode === 'login' && 'Entrar no Portal'}
              {authMode === 'signup' && 'Criar nova conta'}
              {authMode === 'forgot' && 'Recuperar Senha'}
            </CardTitle>
            <CardDescription className="text-xs font-semibold uppercase tracking-tight text-gray-400">
              {authMode === 'login' && 'Acesse seus materiais e aulas'}
              {authMode === 'signup' && 'Comece sua jornada no inglês agora'}
              {authMode === 'forgot' && 'Enviaremos um link para seu e-mail'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={authMode === 'forgot' ? handleResetPassword : handleAuth} className="space-y-5">
              {authMode === 'signup' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="ml-1 text-[10px] font-black uppercase text-gray-400">
                    Nome Completo
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="Seu nome"
                    className="rounded-xl border-gray-100 bg-white/50 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="ml-1 text-[10px] font-black uppercase text-gray-400">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="rounded-xl border-gray-100 bg-white/50 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {authMode !== 'forgot' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="ml-1 text-[10px] font-black uppercase text-gray-400">
                      Senha
                    </Label>
                    {authMode === 'login' ? (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setAuthMode('forgot')}
                          className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:underline"
                        >
                          Esqueci a senha
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('forgot')
                            setError('')
                            setSuccessMessage(
                              'Primeiro acesso? Use o link enviado por e-mail para definir sua senha. O portal não usa os 6 primeiros dígitos do CPF como senha.'
                            )
                          }}
                          className="text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:underline"
                        >
                          Primeiro acesso
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="rounded-xl border-gray-100 bg-white/50 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  {authMode === 'login' ? (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Primeiro acesso</p>
                      <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-600">
                        A senha inicial não é formada pelos 6 primeiros dígitos do CPF. Use
                        <span className="font-black text-blue-700"> Primeiro acesso</span> ou
                        <span className="font-black text-blue-700"> Esqueci a senha</span> para receber o link de definição de senha no e-mail cadastrado.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {error ? (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                  <p className="text-[10px] font-bold uppercase text-red-600">{error}</p>
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-[10px] font-bold uppercase text-emerald-600">{successMessage}</p>
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full rounded-xl bg-[#1e3a5f] py-6 font-bold text-white shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] hover:bg-[#162a45]"
                disabled={loading}
              >
                {loading
                  ? 'Processando...'
                  : authMode === 'login'
                    ? 'Acessar Painel'
                    : authMode === 'signup'
                      ? 'Criar Conta'
                      : 'Recuperar Senha'}
              </Button>

              <div className="flex flex-col gap-3 border-t border-gray-100/50 pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="text-xs font-bold text-[#1e3a5f] underline-offset-4 hover:underline"
                >
                  {authMode === 'login' ? 'Não tem conta? Crie uma agora' : 'Já tem conta? Faça o login'}
                </button>
                {authMode === 'forgot' ? (
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="text-[10px] font-black uppercase tracking-widest text-gray-400 transition-colors hover:text-slate-900"
                  >
                    Voltar para o login
                  </button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
