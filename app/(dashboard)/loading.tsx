// deslop-ignore-file
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-md bg-muted/60 animate-pulse" />
        <div className="h-4 w-96 rounded-md bg-muted/40 animate-pulse" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded bg-muted/60 animate-pulse" />
              <div className="h-7 w-7 rounded-md bg-muted/40 animate-pulse" />
            </div>
            <div className="h-7 w-16 rounded bg-muted/80 animate-pulse" />
            <div className="h-3 w-32 rounded bg-muted/40 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Control bar skeleton */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-9 w-72 rounded-md bg-muted/60 animate-pulse" />
        <div className="h-9 w-32 rounded-md bg-muted/60 animate-pulse" />
      </div>

      {/* Table Skeleton */}
      <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
        <div className="h-10 border-b border-border bg-muted/30" />
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center justify-between p-4">
              <div className="space-y-2">
                <div className="h-4 w-48 rounded bg-muted/60 animate-pulse" />
                <div className="h-3 w-28 rounded bg-muted/40 animate-pulse" />
              </div>
              <div className="h-4 w-20 rounded bg-muted/40 animate-pulse" />
              <div className="h-4 w-24 rounded bg-muted/40 animate-pulse" />
              <div className="h-6 w-16 rounded bg-muted/50 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
