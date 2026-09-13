import { cn } from "@/lib/utils";

const PALETTES = [
  ["#1a2228", "#5eead4"],
  ["#1c1a24", "#d5dbe3"],
  ["#141a1c", "#8fceaa"],
  ["#1a1814", "#e8c07a"],
  ["#18141a", "#c4b5a0"],
  ["#101418", "#9aa1ab"],
  ["#16120e", "#e07a7a"],
  ["#12161c", "#7dd3fc"],
];

export function VideoThumb({
  seed,
  title,
  className,
}: {
  seed: string;
  title: string;
  className?: string;
}) {
  const i = Number(seed || "1") % PALETTES.length;
  const [bg, fg] = PALETTES[i] ?? PALETTES[0]!;
  const bars = 5 + (i % 4);
  return (
    <div
      className={cn("relative overflow-hidden thumb-grid", className)}
      style={{ background: bg }}
      aria-hidden
    >
      <svg viewBox="0 0 160 200" className="absolute inset-0 h-full w-full">
        {Array.from({ length: bars }).map((_, n) => (
          <rect
            key={n}
            x={12 + n * (140 / bars)}
            y={40 + ((n * 17) % 50)}
            width={Math.max(8, 140 / bars - 6)}
            height={90 - ((n * 13) % 40)}
            rx="3"
            fill={fg}
            opacity={0.18 + (n % 3) * 0.12}
          />
        ))}
        <circle cx="128" cy="36" r="10" fill={fg} opacity="0.35" />
        <path d="M18 168 H142" stroke={fg} strokeWidth="2" opacity="0.4" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 p-2.5">
        <p className="line-clamp-2 font-display text-[11px] font-semibold leading-tight text-fg">
          {title}
        </p>
      </div>
    </div>
  );
}
