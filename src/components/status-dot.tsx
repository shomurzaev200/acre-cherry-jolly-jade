import { cn } from "@/lib/utils";

const TONE = {
  ok: "bg-ok text-ok",
  warn: "bg-warn text-warn",
  danger: "bg-danger text-danger",
  cyan: "bg-cyan text-cyan",
  violet: "bg-violet text-violet",
  muted: "bg-fg-subtle text-fg-subtle",
} as const;

export function StatusDot({
  tone = "ok",
  pulse = false,
  label,
}: {
  tone?: keyof typeof TONE;
  pulse?: boolean;
  label?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn("size-1.5 rounded-full", TONE[tone], pulse && "pulse-dot")}
        aria-hidden
      />
      {label ? <span className="text-[11px] uppercase tracking-[0.14em] text-fg-muted">{label}</span> : null}
    </span>
  );
}
