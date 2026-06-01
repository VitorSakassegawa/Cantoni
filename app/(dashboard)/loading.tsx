export default function DashboardLoading() {
  return (
    <div role="status" aria-live="polite" className="animate-fade-in space-y-8">
      <span className="sr-only">Carregando…</span>

      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-8 w-48 animate-pulse rounded-2xl bg-slate-200/70" />
        <div className="h-4 w-72 animate-pulse rounded-xl bg-slate-200/50" />
      </div>

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card space-y-4 p-6" aria-hidden="true">
            <div className="h-4 w-24 animate-pulse rounded-lg bg-slate-200/70" />
            <div className="h-10 w-3/4 animate-pulse rounded-xl bg-slate-200/60" />
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded-md bg-slate-200/50" />
              <div className="h-3 w-5/6 animate-pulse rounded-md bg-slate-200/50" />
            </div>
            <div className="h-10 w-full animate-pulse rounded-2xl bg-slate-200/50" />
          </div>
        ))}
      </div>
    </div>
  )
}
