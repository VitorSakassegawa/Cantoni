import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type Crumb = { label: string; href?: string }

/**
 * Trilha de navegação para telas profundas. Presentacional puro — funciona em
 * server e client components. O último item é tratado como a página atual.
 */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Trilha de navegação"
      className="flex flex-wrap items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 ? (
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
            ) : null}
            {item.href && !isLast ? (
              <Link href={item.href} className="transition-colors hover:text-blue-600">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-slate-700' : undefined} aria-current={isLast ? 'page' : undefined}>
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
