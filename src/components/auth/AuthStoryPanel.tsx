import { cn } from "@/lib/utils";

type Props = {
  variant: "login" | "register";
  className?: string;
};

/**
 * Immersive left panel: CSS/SVG “diorama” — Indian seller context without external image assets.
 */
export function AuthStoryPanel({ variant, className }: Props) {
  const headline = "Scale your business, faster.";
  const sub =
    variant === "login"
      ? "The smartest toolkit for Meesho, Flipkart & Amazon sellers."
      : "Start with Photo Studio in minutes. No credit card. No complicated setup.";

  return (
    <div
      className={cn(
        "relative hidden min-h-[640px] flex-col justify-between overflow-hidden lg:flex",
        "border-r border-border-default bg-gradient-to-b from-[#121214] via-bg-base to-[#060607]",
        className
      )}
    >
      {/* Warm rim light */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_20%,color-mix(in_srgb,var(--brand)_12%,transparent),transparent_55%)]" />
      <div className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-feature-photo/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-16 bottom-1/4 h-72 w-72 rounded-full bg-brand/8 blur-[90px]" />

      <div className="relative z-[1] px-10 pb-6 pt-10">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-brand">GrowthOS</div>
        <h2 className="mt-6 max-w-lg text-3xl font-extrabold leading-[1.1] tracking-tight text-text-primary md:text-4xl">
          {headline}
        </h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-text-secondary">{sub}</p>
      </div>

      {/* Scene */}
      <div className="relative z-[1] mx-auto flex min-h-[340px] w-full max-w-lg flex-1 items-end px-6 pb-8">
        <div className="relative h-[280px] w-full">
          {/* Stall counter */}
          <div className="absolute bottom-0 left-1/2 h-24 w-[88%] -translate-x-1/2 rounded-t-lg border border-border-subtle bg-gradient-to-b from-bg-elevated to-bg-overlay shadow-[0_-8px_40px_rgba(0,0,0,0.35)]" />
          {/* Shelves */}
          <div className="absolute bottom-24 left-[8%] h-20 w-[28%] rounded border border-border-subtle/80 bg-bg-surface/40 backdrop-blur-sm">
            <div className="flex h-full flex-col justify-around px-2 py-1">
              <div className="h-2 rounded-sm bg-gradient-to-r from-amber-800/40 to-amber-600/30" />
              <div className="h-2 rounded-sm bg-gradient-to-r from-rose-800/30 to-rose-600/25" />
              <div className="h-2 rounded-sm bg-gradient-to-r from-emerald-800/30 to-emerald-600/25" />
            </div>
          </div>
          <div className="absolute bottom-24 right-[8%] h-20 w-[28%] rounded border border-border-subtle/80 bg-bg-surface/40 backdrop-blur-sm">
            <div className="grid h-full grid-cols-3 gap-1 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-sm bg-text-tertiary/15" />
              ))}
            </div>
          </div>

          {/* Seller + tablet */}
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-end gap-3">
            <svg width="72" height="120" viewBox="0 0 72 120" className="text-text-secondary" aria-hidden>
              <ellipse cx="36" cy="112" rx="28" ry="6" fill="currentColor" opacity="0.12" />
              <path
                d="M36 20c-8 0-14 6-14 14v8c0 8 6 14 14 14s14-6 14-14v-8c0-8-6-14-14-14z"
                fill="currentColor"
                opacity="0.35"
              />
              <path d="M18 52h36v48c0 6-8 12-18 12s-18-6-18-12V52z" fill="currentColor" opacity="0.45" />
              <path d="M22 100l-4 18h36l-4-18" fill="currentColor" opacity="0.35" />
            </svg>
            <div className="relative mb-2 w-[140px] rounded-lg border border-border-default bg-bg-surface p-2 shadow-xl ring-1 ring-white/5">
              <div className="mb-1 flex items-center justify-between text-[8px] text-text-tertiary">
                <span>GrowthOS</span>
                <span className="text-success">●</span>
              </div>
              <div className="space-y-1 rounded bg-bg-elevated p-1.5">
                <div className="flex gap-1">
                  <div className="h-6 flex-1 rounded-sm bg-brand/25" />
                  <div className="h-6 flex-1 rounded-sm bg-brand/15" />
                </div>
                <div className="h-1 w-full rounded-full bg-bg-overlay">
                  <div className="h-full w-[68%] rounded-full bg-brand" />
                </div>
              </div>
            </div>
          </div>

          {/* Floating: photo stack */}
          <div className="animate-float-fast absolute left-0 top-8 w-[100px] rounded-lg border border-border-default bg-bg-surface/90 p-2 shadow-lg backdrop-blur-sm">
            <div className="text-[9px] font-bold uppercase tracking-wide text-feature-photo">Photo Studio</div>
            <div className="mt-2 flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 w-8 rounded border border-border-subtle bg-gradient-to-br from-zinc-600/50 to-zinc-800/80 shadow-md"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
            <div className="mt-2 text-[10px] font-semibold text-text-primary">Batch processing…</div>
          </div>

          {/* Floating: WhatsApp */}
          <div className="animate-float-slow absolute right-0 top-4 max-w-[140px] rounded-xl border border-border-default bg-[color-mix(in_srgb,var(--feature-whatsapp)_12%,var(--bg-surface))] p-2 shadow-lg">
            <div className="text-[9px] font-bold text-feature-whatsapp">WhatsApp</div>
            <div className="mt-2 space-y-1.5">
              <div className="ml-auto max-w-[95%] rounded-lg rounded-tr-sm bg-bg-elevated px-2 py-1 text-[9px] text-text-secondary">
                COD confirm?
              </div>
              <div className="max-w-[95%] rounded-lg rounded-tl-sm bg-feature-whatsapp/20 px-2 py-1 text-[9px] text-text-primary">
                Order #4821 ✓
              </div>
            </div>
          </div>

          {/* Search rank */}
          <div className="absolute bottom-28 left-1/2 w-[200px] -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-full border border-border-subtle bg-bg-surface/95 px-3 py-1.5 shadow-md backdrop-blur">
              <div className="h-2 flex-1 rounded-full bg-bg-overlay" />
              <span className="rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">#1</span>
            </div>
            <div className="mt-1 text-center text-[9px] text-text-tertiary">Listings — Page 1</div>
          </div>
        </div>
      </div>

      <p className="relative z-[1] px-10 pb-10 text-xs text-text-tertiary">
        Trusted by sellers in Surat, Bhiwandi, Jaipur &amp; beyond.
      </p>
    </div>
  );
}
