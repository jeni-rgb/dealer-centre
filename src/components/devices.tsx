import Image from "next/image";

/** Device frames for screenshots on the marketing and guide pages. Pure CSS frames, next/image inside. */
export function Phone({ src, alt, className = "", priority = false }: { src: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <figure className={`relative shrink-0 ${className}`}>
      <div className="rounded-[38px] border-[6px] border-ink bg-ink p-[3px] shadow-[0_30px_60px_-20px_rgba(26,26,23,0.35)]">
        <div className="relative overflow-hidden rounded-[30px] bg-surface">
          <span className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-ink" aria-hidden="true" />
          <Image src={src} alt={alt} width={780} height={1688} sizes="(max-width: 768px) 260px, 300px" priority={priority} className="block h-auto w-full" />
        </div>
      </div>
    </figure>
  );
}

export function Browser({ src, alt, className = "", priority = false }: { src: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <figure className={`overflow-hidden rounded-[16px] border border-border bg-white shadow-[0_30px_60px_-30px_rgba(26,26,23,0.3)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-border bg-surface-2 px-4 py-2.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-[#D9CF8E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#C9B38A]" /><span className="h-2.5 w-2.5 rounded-full bg-[#9FBBA6]" />
        <span className="ml-3 h-5 flex-1 rounded-md bg-white text-[11px] leading-5 text-ink-muted"><span className="pl-2">thedealercentre.co.uk</span></span>
      </div>
      <Image src={src} alt={alt} width={2880} height={1800} sizes="(max-width: 1152px) 100vw, 1152px" priority={priority} className="block h-auto w-full" />
    </figure>
  );
}
