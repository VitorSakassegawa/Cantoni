'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
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
  const [validatingLink, setValidatingLink] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let active = true

    async function bootstrapRecoverySession() {
      try {
        const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')

        if (type === 'recovery' && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            throw error
          }

          window.history.replaceState({}, document.title, window.location.pathname)
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          toast.error('Link de redefinição inválido ou expirado. Solicite um novo e-mail.')
          router.replace('/login')
          return
        }
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, 'Não foi possível validar o link de redefinição.'))
        router.replace('/login')
        return
      } finally {
        if (active) {
          setValidatingLink(false)
        }
      }
    }

    void bootstrapRecoverySession()

    return () => {
      active = false
    }
  }, [router, supabase])

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

  if (validatingLink) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/50 p-4">
        <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] animate-pulse rounded-full bg-blue-100/30 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] animate-pulse rounded-full bg-blue-200/20 blur-3xl [animation-delay:1s]" />

        <div className="relative z-10 w-full max-w-md">
          <Card className="glass-card overflow-hidden border-none shadow-2xl shadow-blue-900/5">
            <CardHeader className="pb-2 text-center">
              <CardTitle className="text-xl font-bold text-gray-900">Validando link</CardTitle>
              <CardDescription className="text-xs font-semibold uppercase tracking-tight text-gray-400">
                Aguarde enquanto preparamos sua redefinição de senha
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-6 text-center text-sm font-medium text-slate-500">
                Estamos conferindo a autenticidade do link enviado por e-mail.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/50 p-4">
      <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] animate-pulse rounded-full bg-blue-100/30 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] animate-pulse rounded-full bg-blue-200/20 blur-3xl [animation-delay:1s]" />

      <div className="relative z-10 w-full max-w-md">
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
            <CardTitle className="text-xl font-bold text-gray-900">Nova senha</CardTitle>
            <CardDescription className="text-xs font-semibold uppercase tracking-tight text-gray-400">
              Escolha uma senha forte para sua segurança
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="ml-1 text-[10px] font-black uppercase text-gray-400">
                  Nova senha
                </Label>
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
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="ml-1 text-[10px] font-black uppercase text-gray-400">
                  Confirmar senha
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="rounded-xl border-gray-100 bg-white/50 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl bg-[#1e3a5f] py-6 font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-[#162a45] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
