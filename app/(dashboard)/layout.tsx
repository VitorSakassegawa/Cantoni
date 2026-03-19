import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, BookOpen, Users, LayoutDashboard, CreditCard } from 'lucide-react'

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
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-900 text-white flex flex-col">
        <div className="p-6 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white text-blue-900 font-bold flex items-center justify-center">
              G
            </div>
            <div>
              <p className="font-semibold text-sm">Teacher Gabriel</p>
              <p className="text-blue-300 text-xs">{isProfessor ? 'Professor' : 'Aluno'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            href={basePath}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-800 text-sm transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>

          {isProfessor && (
            <>
              <Link
                href="/professor/alunos"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-800 text-sm transition-colors"
              >
                <Users className="w-4 h-4" />
                Alunos
              </Link>
              <Link
                href="/professor/pagamentos"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-800 text-sm transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Pagamentos
              </Link>
            </>
          )}

          {!isProfessor && (
            <>
              <Link
                href="/aluno/aulas"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-800 text-sm transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                Minhas Aulas
              </Link>
              <Link
                href="/aluno/pagamentos"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-800 text-sm transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Pagamentos
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-blue-800">
          <p className="text-xs text-blue-300 mb-2 px-3">{profile?.full_name}</p>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-800 text-sm transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
