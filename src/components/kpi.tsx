import type { ReactNode } from "react";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Kpi({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string | number | null;
  hint?: string;
  warn?: boolean;
}) {
  const shown = typeof value === "number" ? formatCompact(value) : (value ?? "N/A");
  return (
    <div className="panel p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-fg-subtle">{label}</p>
      <p className={cn("mt-2 font-mono text-2xl tabular tracking-tight", warn ? "text-danger" : "text-fg")}>
        {shown}
      </p>
      {hint ? <p className="mt-1 text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  actions,
}: {
  kicker: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-fg-subtle">{kicker}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      </div>
      {actions}
    </div>
  );
}
