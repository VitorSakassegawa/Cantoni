import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
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
      }
    case 'success':
      return {
        icon: CheckCircle2,
        badgeVariant: 'success' as const,
        iconClass: 'text-emerald-600',
      }
    default:
      return {
        icon: Info,
        badgeVariant: 'secondary' as const,
        iconClass: 'text-blue-600',
      }
  }
}

interface NotificationFeedProps {
  title: string
  items: FeedItem[]
  emptyMessage: string
}

export default function NotificationFeed({
  title,
  items,
  emptyMessage,
}: NotificationFeedProps) {
  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-4 border-b border-slate-100">
        <CardTitle className="text-xs font-black text-slate-500 flex items-center gap-2 uppercase tracking-[0.2em]">
          <Bell className="w-4 h-4 text-blue-500" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="p-6 text-[11px] font-bold text-slate-400">{emptyMessage}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const config = severityConfig(item.severity)
              const Icon = config.icon

              return (
                <div key={item.id} className="p-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                      <Icon className={`w-4 h-4 ${config.iconClass}`} />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[11px] font-black text-slate-900 tracking-tight">{item.title}</p>
                        <Badge variant={config.badgeVariant} className="text-[8px] font-black uppercase tracking-widest">
                          {item.severity}
                        </Badge>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 leading-relaxed">{item.description}</p>
                      {item.meta ? (
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{item.meta}</p>
                      ) : null}
                    </div>
                  </div>

                  {item.href ? (
                    <Link
                      href={item.href}
                      className="shrink-0 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {item.actionLabel || 'Abrir'}
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
