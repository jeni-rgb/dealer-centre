export default function Loading() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-4 bg-[var(--color-bg,#f7f5ef)] p-5" aria-busy="true" aria-label="Loading">
      <div className="h-36 animate-pulse rounded-[18px] bg-black/10" />
      <div className="grid grid-cols-2 gap-3"><div className="h-12 animate-pulse rounded-[12px] bg-black/10" /><div className="h-12 animate-pulse rounded-[12px] bg-black/10" /></div>
      {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-[14px] bg-black/5" />)}
    </div>
  );
}
