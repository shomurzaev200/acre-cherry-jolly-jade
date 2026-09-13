import { formatCompact, formatPct } from "@/lib/format";
import { rate } from "@/lib/engine";
import type { FunnelTotals } from "@/lib/types";

export function Funnel({ data }: { data: FunnelTotals }) {
  const steps = [
    { key: "Просмотры", value: data.views, hint: "video views" },
    { key: "Охват", value: data.reach, hint: "reach" },
    { key: "Профиль", value: data.profileVisits, hint: "заходы в профиль" },
    { key: "Ссылка", value: data.linkClicks, hint: "клики по ссылке" },
  ];
  const max = Math.max(...steps.map((s) => s.value ?? 0), 1);
  return (
    <div className="panel p-5 md:p-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan/80">Главная воронка</p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">
            Views → Profile → Link
          </h2>
        </div>
        <p className="text-xs text-fg-muted">Источник: {sourceText(data.source)}</p>
      </div>
      <div className="grid gap-3">
        {steps.map((s, i) => {
          const w = s.value == null ? 0.12 : Math.max(0.18, s.value / max);
          const prev = i === 0 ? null : steps[i - 1]!.value;
          const conv = rate(s.value, prev);
          return (
            <div key={s.key} className="grid grid-cols-[92px_1fr_auto] items-center gap-3">
              <div>
                <p className="text-xs font-medium text-fg">{s.key}</p>
                <p className="text-[10px] text-fg-subtle">{s.hint}</p>
              </div>
              <div className="h-9 overflow-hidden rounded-[var(--radius-sm)] bg-bg">
                <div
                  className="h-full rounded-[var(--radius-sm)] bg-linear-to-r from-cyan/30 to-violet/25 transition-[width] duration-500"
                  style={{ width: `${w * 100}%` }}
                />
              </div>
              <div className="min-w-24 text-right">
                <p className="font-mono text-sm tabular text-fg">{formatCompact(s.value)}</p>
                {i > 0 ? <p className="text-[10px] text-fg-subtle">{formatPct(conv)}</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function sourceText(s: FunnelTotals["source"]) {
  if (s === "official_api") return "Meta Graph API";
  if (s === "demo_workspace") return "демо-набор (не Instagram API)";
  if (s === "mixed") return "смешанный";
  return "нет данных";
}
