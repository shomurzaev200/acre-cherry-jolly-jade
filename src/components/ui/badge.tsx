import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "danger" | "cyan" | "violet" | "pink" | "teal";
  className?: string;
}) {
  const tones = {
    neutral: "bg-bg-subtle text-fg-muted border-line",
    ok: "bg-ok/10 text-ok border-ok/25",
    warn: "bg-warn/10 text-warn border-warn/25",
    danger: "bg-danger/10 text-danger border-danger/25",
    cyan: "bg-cyan/10 text-cyan border-cyan/25",
    teal: "bg-cyan/10 text-cyan border-cyan/25",
    violet: "bg-violet/10 text-violet border-violet/25",
    pink: "bg-pink/10 text-pink border-pink/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
