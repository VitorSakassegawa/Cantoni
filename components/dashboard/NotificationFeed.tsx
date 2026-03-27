'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, CheckCircle2, ChevronRight, Info, TriangleAlert } from 'lucide-react'
import { FeedItem } from '@/lib/insights'

function severityConfig(severity: FeedItem['severity']) {
  switch (severity) {
    case 'warning':
      return {
        icon: TriangleAlert,
        badgeVariant: 'warning' as const,
        iconClass: 'text-amber-600',
        label: 'Atencao',
      }
    case 'success':
      return {
        icon: CheckCircle2,
        badgeVariant: 'success' as const,
        iconClass: 'text-emerald-600',
        label: 'Concluido',
      }
    default:
      return {
        icon: Info,
        badgeVariant: 'secondary' as const,
        iconClass: 'text-blue-600',
        label: 'Info',
      }
  }
}

interface NotificationFeedProps {
  id?: string
  title: string
  items: FeedItem[]
  emptyMessage: string
  initialVisibleCount?: number
  pageSize?: number
}

export default function NotificationFeed({
  id,
  title,
  items,
  emptyMessage,
  initialVisibleCount = 5,
  pageSize = 5,
}: NotificationFeedProps) {
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount)
  const visibleItems = items.slice(0, visibleCount)
  const hasMore = items.length > visibleItems.length

  return (
    <Card id={id} className="glass-card overflow-hidden scroll-mt-24">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
          <Bell className="h-4 w-4 text-blue-500" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="p-6 text-[11px] font-bold text-slate-400">{emptyMessage}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleItems.map((item) => {
              const config = severityConfig(item.severity)
              const Icon = config.icon

              return (
                <div key={item.id} className="flex items-start justify-between gap-4 p-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50">
                      <Icon className={`h-4 w-4 ${config.iconClass}`} />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] font-black tracking-tight text-slate-900">{item.title}</p>
                        <Badge variant={config.badgeVariant} className="text-[8px] font-black uppercase tracking-widest">
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-[10px] font-bold leading-relaxed text-slate-500">{item.description}</p>
                      {item.meta ? (
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">{item.meta}</p>
                      ) : null}
                    </div>
                  </div>

                  {item.href ? (
                    <Link
                      href={item.href}
                      className="inline-flex shrink-0 items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-600 transition-colors hover:text-blue-800"
                    >
                      {item.actionLabel || 'Abrir'}
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  ) : null}
                </div>
              )
            })}

            {hasMore ? (
              <div className="p-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVisibleCount((current) => current + pageSize)}
                  className="w-full rounded-2xl border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-blue-200 hover:text-blue-700"
                >
                  Mostrar mais {Math.min(pageSize, items.length - visibleItems.length)}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
