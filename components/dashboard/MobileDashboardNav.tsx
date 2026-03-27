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
  Mail,
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
  emails: Mail,
  documentos: FileText,
  jornada: Flame,
  perfil: User,
} as const

function normalizePath(pathname: string, href: string) {
  if (href === '/aluno' || href === '/professor') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function MobileDashboardNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <div className="-mx-1 mt-4 flex max-w-full snap-x gap-3 overflow-x-auto px-1 pb-1">
      {items.map((item) => {
        const Icon = iconMap[item.icon as keyof typeof iconMap] || LayoutDashboard
        const isActive = normalizePath(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex shrink-0 snap-start items-center gap-2 rounded-2xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all ${
              isActive
                ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-blue-600'}`} />
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
