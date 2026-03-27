'use client'

export const dynamic = 'force-dynamic'

import Image from 'next/image'
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

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()

      toast.success('Bem-vindo de volta!')
      router.push(profile?.role === 'professor' ? '/professor' : '/aluno')
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Erro na autenticação.')
      setError(message)
      toast.error(message)
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
      const response = await fetch('/api/auth/recuperar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erro ao enviar o link de recuperação.')

      setSuccessMessage('E-mail de recuperação enviado. Verifique sua caixa de entrada.')
      toast.success('Link de recuperação enviado!')
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Erro ao enviar o link de recuperação.')
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/50 p-4">
      <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] animate-pulse rounded-full bg-blue-100/30 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] animate-pulse rounded-full bg-blue-200/20 blur-3xl [animation-delay:1s]" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="mb-10 text-center">
          <div className="mb-5 inline-flex rounded-[28px] border border-slate-200/70 bg-white/90 p-5 shadow-xl shadow-blue-900/10 backdrop-blur">
            <Image
              src="/logo-cantoni.svg"
              alt="Cantoni English School"
              width={88}
              height={88}
              priority
              className="h-[88px] w-[88px]"
            />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#1e3a5f]">
            Learning Management System
          </p>
        </div>

        <Card className="glass-card overflow-hidden border-none shadow-2xl shadow-blue-900/5">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-xl font-bold text-gray-900">
              {authMode === 'login' ? 'Entrar no portal' : 'Recuperar senha'}
            </CardTitle>
            <CardDescription className="text-xs font-semibold uppercase tracking-tight text-gray-400">
              {authMode === 'login'
                ? 'Acesse materiais, agenda e registros acadêmicos'
                : 'Enviaremos um link seguro para o seu e-mail'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={authMode === 'forgot' ? handleResetPassword : handleAuth} className="space-y-5">
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

              {authMode === 'login' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="ml-1 text-[10px] font-black uppercase text-gray-400">
                      Senha
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot')
                        setError('')
                        setSuccessMessage('')
                      }}
                      className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:underline"
                    >
                      Esqueci a senha
                    </button>
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
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Primeiro acesso
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Use o link enviado ao seu e-mail para definir sua senha inicial.
                  </p>
                </div>
              )}

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
                className="w-full rounded-xl bg-[#1e3a5f] py-6 font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-[#162a45] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? 'Processando...' : authMode === 'login' ? 'Acessar painel' : 'Recuperar senha'}
              </Button>

              <div className="flex flex-col gap-3 border-t border-gray-100/50 pt-4 text-center">
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
