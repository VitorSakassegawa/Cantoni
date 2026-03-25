'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  Calendar,
  CreditCard,
  FileText,
  Flame,
  LayoutDashboard,
  Sparkles,
  Target,
  User,
  Users,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: string
}

const iconMap = {
  dashboard: LayoutDashboard,
  financeiro: CreditCard,
  alunos: Users,
  aulas: BookOpen,
  nivelamento: Sparkles,
  target: Target,
  calendario: Calendar,
  documentos: FileText,
  jornada: Flame,
  perfil: User,
} as const

function normalizePath(pathname: string, href: string) {
  if (href === '/aluno' || href === '/professor') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function DesktopDashboardNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 space-y-2 px-4 py-4">
      {items.map((item) => {
        const Icon = iconMap[item.icon as keyof typeof iconMap] || LayoutDashboard
        const isActive = normalizePath(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`group flex items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all ${
              isActive
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20'
                : 'text-blue-900/70 hover:bg-white/50 hover:text-blue-900'
            }`}
          >
            <div
              className={`rounded-xl p-2 transition-colors ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span className="tracking-tight">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
