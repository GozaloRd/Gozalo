import { GlassCard } from "./GlassCard";

function Bar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gradient-to-r from-white/[0.06] to-violet-500/10 ${className}`}
    />
  );
}

export function DashboardOverviewSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Bar className="h-8 w-48 max-w-full" />
        <Bar className="mt-2 h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <GlassCard key={i} className="p-5">
            <Bar className="h-3 w-24" />
            <Bar className="mt-4 h-10 w-20" />
            <Bar className="mt-2 h-3 w-32" />
          </GlassCard>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-2">
          <Bar className="h-4 w-40" />
          <Bar className="mt-6 h-64 w-full" />
        </GlassCard>
        <GlassCard className="p-5">
          <Bar className="h-4 w-32" />
          <Bar className="mt-6 h-8 w-full" />
          <Bar className="mt-4 h-4 w-3/4" />
        </GlassCard>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <GlassCard className="p-5">
          <Bar className="h-4 w-36" />
          {[1, 2, 3].map((i) => (
            <Bar key={i} className="mt-4 h-12 w-full" />
          ))}
        </GlassCard>
        <GlassCard className="p-5">
          <Bar className="h-4 w-36" />
          {[1, 2, 3].map((i) => (
            <Bar key={i} className="mt-4 h-12 w-full" />
          ))}
        </GlassCard>
      </div>
    </div>
  );
}
