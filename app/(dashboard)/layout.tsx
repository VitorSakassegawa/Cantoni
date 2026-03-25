import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  LogOut,
  BookOpen,
  Users,
  LayoutDashboard,
  CreditCard,
  User,
  Calendar,
  Sparkles,
  FileText,
  Flame,
  Target,
} from 'lucide-react'
import { Logo } from '@/components/dashboard/Logo'
import DesktopDashboardNav from '@/components/dashboard/DesktopDashboardNav'
import MobileDashboardNav from '@/components/dashboard/MobileDashboardNav'
import OfflineStatusBar from '@/components/pwa/OfflineStatusBar'
import PwaInstallPrompt from '@/components/pwa/PwaInstallPrompt'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  iconKey: string
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()

  const isProfessor = profile?.role === 'professor'
  const basePath = isProfessor ? '/professor' : '/aluno'
  const navItems: NavItem[] = isProfessor
    ? [
        { href: basePath, label: 'Dashboard', icon: LayoutDashboard, iconKey: 'dashboard' },
        { href: '/professor/pagamentos', label: 'Financeiro', icon: CreditCard, iconKey: 'financeiro' },
        { href: '/professor/alunos', label: 'Alunos', icon: Users, iconKey: 'alunos' },
        { href: '/professor/aulas', label: 'Aulas', icon: BookOpen, iconKey: 'aulas' },
        { href: '/professor/nivelamento', label: 'Nivelamento', icon: Sparkles, iconKey: 'nivelamento' },
        { href: '/professor/calendario', label: 'Calendário', icon: Calendar, iconKey: 'calendario' },
        { href: '/professor/perfil', label: 'Meu Perfil', icon: User, iconKey: 'perfil' },
      ]
    : [
        { href: basePath, label: 'Dashboard', icon: LayoutDashboard, iconKey: 'dashboard' },
        { href: '/aluno/pagamentos', label: 'Financeiro', icon: CreditCard, iconKey: 'financeiro' },
        { href: '/aluno/aulas', label: 'Aulas', icon: BookOpen, iconKey: 'aulas' },
        { href: '/aluno/jornada', label: 'Jornada', icon: Flame, iconKey: 'jornada' },
        { href: '/aluno/nivelamento', label: 'Nivelamento', icon: Target, iconKey: 'target' },
        { href: '/aluno/calendario', label: 'Calendário', icon: Calendar, iconKey: 'calendario' },
        { href: '/aluno/documentos', label: 'Documentos', icon: FileText, iconKey: 'documentos' },
        { href: '/aluno/perfil', label: 'Meu Perfil', icon: User, iconKey: 'perfil' },
      ]

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--background)] transition-colors duration-500 lg:flex">
      <div
        className="pointer-events-none absolute top-[-10%] right-[-10%] h-[50%] w-[50%] animate-pulse rounded-full bg-blue-500/20 blur-[140px]"
        style={{ animationDuration: '8s' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-10%] left-[-10%] h-[50%] w-[50%] animate-pulse rounded-full bg-indigo-600/15 blur-[140px]"
        style={{ animationDuration: '12s' }}
      />
      <div className="pointer-events-none absolute top-[20%] left-[20%] h-[30%] w-[30%] rounded-full bg-sky-400/10 blur-[120px]" />

      <div className="sticky top-0 z-30 overflow-x-hidden border-b border-white/40 bg-white/70 px-4 py-4 shadow-lg shadow-blue-900/5 backdrop-blur-2xl lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
              <Logo src="/logo-cantoni.svg" fallbackAvatar="C" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-tight text-slate-900">{profile?.full_name}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                {isProfessor ? 'Professor' : 'Aluno'}
              </p>
            </div>
          </div>

          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-600"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </form>
        </div>

        <MobileDashboardNav items={navItems.map(({ href, label, iconKey }) => ({ href, label, icon: iconKey }))} />
      </div>

      <aside className="z-10 m-6 mr-0 hidden w-72 flex-col lg:flex">
        <div className="glass-panel flex flex-1 flex-col overflow-hidden rounded-[2.5rem] border-white/30 shadow-2xl shadow-blue-900/10">
          <div className="p-8 pb-4">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex w-full items-center justify-center px-4">
                <Logo src="/logo-cantoni.svg" fallbackAvatar="C" />
              </div>
              <p className="max-w-[140px] text-[10px] font-black uppercase leading-tight tracking-[0.2em] text-blue-400">
                Learning Management System
              </p>
            </div>
          </div>

          <DesktopDashboardNav items={navItems.map(({ href, label, iconKey }) => ({ href, label, icon: iconKey }))} />

          <div className="mt-auto border-t border-white/20 bg-white/10 p-6">
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/40 bg-white/30 p-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-lg">
                {profile?.full_name?.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black tracking-tight text-blue-900">{profile?.full_name}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">
                  {isProfessor ? 'Professor' : 'Aluno'}
                </p>
              </div>
            </div>

            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                Desconectar
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mobile-safe-bottom min-w-0 max-w-full px-4 py-4 sm:px-6 lg:p-8">
          <OfflineStatusBar />
          <PwaInstallPrompt />
          {children}
        </div>
      </main>
    </div>
  )
}
