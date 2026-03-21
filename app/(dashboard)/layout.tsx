import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, BookOpen, Users, LayoutDashboard, CreditCard, User } from 'lucide-react'
import { Logo } from '@/components/dashboard/Logo'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const isProfessor = profile?.role === 'professor'
  const basePath = isProfessor ? '/professor' : '/aluno'

  return (
    <div className="min-h-screen flex bg-slate-50 relative overflow-hidden">
      {/* Background blobs for glassmorphism effect */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Sidebar */}
      <aside className="w-72 flex flex-col m-4 mr-0 z-10">
        <div className="flex-1 glass-panel rounded-[2rem] border-white/20 flex flex-col overflow-hidden shadow-2xl shadow-blue-900/5">
          <div className="p-8 pb-4">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-full px-4 flex items-center justify-center">
                <Logo src="/logo-cantoni.svg" fallbackAvatar="C" />
              </div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] leading-tight max-w-[140px]">
                Learning Management System
              </p>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-2 py-4">
            <Link
              href={basePath}
              className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/50 text-blue-900/70 hover:text-blue-900 font-bold text-sm transition-all group"
            >
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              Dashboard
            </Link>

            {isProfessor && (
              <>
                <Link
                  href="/professor/alunos"
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/50 text-blue-900/70 hover:text-blue-900 font-bold text-sm transition-all group"
                >
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Users className="w-4 h-4" />
                  </div>
                  Alunos
                </Link>
                <Link
                  href="/professor/aulas"
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/50 text-blue-900/70 hover:text-blue-900 font-bold text-sm transition-all group"
                >
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  Aulas
                </Link>
                <Link
                  href="/professor/pagamentos"
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/50 text-blue-900/70 hover:text-blue-900 font-bold text-sm transition-all group"
                >
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  Financeiro
                </Link>
                <Link
                  href="/professor/perfil"
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/50 text-blue-900/70 hover:text-blue-900 font-bold text-sm transition-all group"
                >
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  Meu Perfil
                </Link>
              </>
            )}

            {!isProfessor && (
              <>
                <Link
                  href="/aluno/aulas"
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/50 text-blue-900/70 hover:text-blue-900 font-bold text-sm transition-all group"
                >
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  Aulas
                </Link>
                <Link
                  href="/aluno/pagamentos"
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/50 text-blue-900/70 hover:text-blue-900 font-bold text-sm transition-all group"
                >
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  Financeiro
                </Link>
                <Link
                  href="/aluno/perfil"
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/50 text-blue-900/70 hover:text-blue-900 font-bold text-sm transition-all group"
                >
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  Meu Perfil
                </Link>
              </>
            )}
          </nav>

          <div className="p-6 mt-auto border-t border-white/20 bg-white/10">
            <div className="flex items-center gap-3 mb-6 p-2 rounded-2xl bg-white/30 border border-white/40">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg">
                {profile?.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-blue-900 truncate tracking-tight">{profile?.full_name}</p>
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{isProfessor ? 'Professor' : 'Aluno'}</p>
              </div>
            </div>
            
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-500 hover:text-red-600 font-bold text-xs transition-colors w-full tracking-widest uppercase"
              >
                <LogOut className="w-4 h-4" />
                Desconectar
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
