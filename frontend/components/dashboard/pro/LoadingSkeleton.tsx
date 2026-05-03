export function DashboardHomeSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-8 w-48 rounded bg-white/[0.06]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-[#111118]" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="h-72 rounded-lg bg-[#111118] lg:col-span-3" />
        <div className="h-72 rounded-lg bg-[#111118] lg:col-span-2" />
      </div>
    </div>
  );
}
