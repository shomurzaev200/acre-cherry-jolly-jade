import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/lib/use-workspace";

export const Route = createFileRoute("/_app/calendar")({ component: CalendarPage });

function CalendarPage() {
  const { data } = useWorkspace();
  const [mode, setMode] = useState<"day" | "week" | "month">("week");
  const tasks = data?.tasks ?? [];
  const grouped = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const t of tasks) {
      const key = new Date(t.scheduledAt).toISOString().slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [tasks]);
  const slice = mode === "day" ? grouped.slice(0, 1) : mode === "week" ? grouped.slice(0, 7) : grouped.slice(0, 31);
  if (!data) return <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-bg-subtle" />;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Calendar"
        title="Расписание"
        actions={
          <div className="flex gap-1">
            {(["day", "week", "month"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`h-9 rounded-full px-3 text-xs uppercase ${mode === m ? "bg-bg-subtle" : "text-fg-muted"}`}
              >
                {m}
              </button>
            ))}
          </div>
        }
      />
      <div className="space-y-4">
        {slice.map(([day, items]) => (
          <section key={day}>
            <h2 className="mb-2 font-display text-sm font-semibold">{day}</h2>
            <ul className="space-y-2">
              {items.map((t) => {
                const acc = data.accounts.find((a) => a.id === t.accountId);
                const v = data.videos.find((x) => x.id === t.videoId);
                return (
                  <li key={t.id} className="panel grid gap-2 px-4 py-3 text-sm md:grid-cols-[100px_1fr_1fr_auto]">
                    <span className="font-mono tabular">
                      {new Date(t.scheduledAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span>@{acc?.handle}</span>
                    <span className="text-fg-muted">{v?.title}</span>
                    <Badge tone={t.status === "published" ? "ok" : t.status === "failed" ? "danger" : "neutral"}>
                      {t.status}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
