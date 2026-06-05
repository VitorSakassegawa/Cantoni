'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  Calendar,
  Clock3,
  CreditCard,
  FileText,
  Flame,
  LayoutDashboard,
  Mail,
  Sparkles,
  Tag,
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
  precos: Tag,
  target: Target,
  calendario: Calendar,
  cron: Clock3,
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
  const activeRef = useRef<HTMLAnchorElement>(null)

  // Keep the current destination visible — the strip overflows horizontally
  // and the active chip can otherwise be scrolled off-screen.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [pathname])

  return (
    <nav aria-label="Navegação principal" className="relative -mx-1 mt-4">
      <div className="flex max-w-full snap-x gap-3 overflow-x-auto px-1 pb-1">
      {items.map((item) => {
        const Icon = iconMap[item.icon as keyof typeof iconMap] || LayoutDashboard
        const isActive = normalizePath(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            ref={isActive ? activeRef : undefined}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex shrink-0 snap-start items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-black uppercase tracking-widest shadow-sm transition-all ${
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
      {/* Dica visual de que há mais itens para rolar à direita */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent"
        aria-hidden="true"
      />
    </nav>
  )
}
