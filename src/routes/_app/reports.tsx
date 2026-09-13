import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/kpi";
import { formatCompact } from "@/lib/format";
import { grokExplain } from "@/lib/server/workspace";
import { useWorkspace } from "@/lib/use-workspace";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Route = createFileRoute("/_app/reports")({ component: ReportsPage });

function ReportsPage() {
  const { data } = useWorkspace();
  const [weekly, setWeekly] = useState<string | null>(null);
  if (!data) return <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-bg-subtle" />;
  const bestAcc = [...data.accounts]
    .map((a) => ({
      a,
      views: data.scored.filter((s) => s.accountId === a.id).reduce((n, s) => n + (s.views ?? 0), 0),
    }))
    .sort((x, y) => y.views - x.views)[0];
  const bestVid = data.scored[0];

  return (
    <div className="space-y-6">
      <PageHeader kicker="Daily / Weekly" title="AI-отчёты" />
      <section className="panel p-5">
        <h2 className="font-display text-lg font-semibold">Ежедневный отчёт</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <Item k="Publications" v={String(data.tasks.filter((t) => t.status === "published").length)} />
          <Item k="Total views" v={formatCompact(data.funnel.views)} />
          <Item k="Profile visits" v={formatCompact(data.funnel.profileVisits)} />
          <Item k="Link clicks" v={formatCompact(data.funnel.linkClicks)} />
          <Item k="Best account" v={bestAcc ? `@${bestAcc.a.handle}` : "N/A"} />
          <Item k="Best video" v={bestVid?.title ?? "N/A"} />
          <Item k="Best time" v="19:00 (по профилям вечерних слотов)" />
          <Item k="Biggest problem" v={data.fatigue[0]?.message ?? "Нет критичных просадок conversion"} />
        </dl>
      </section>
      <section className="panel p-5">
        <h2 className="font-display text-lg font-semibold">Weekly</h2>
        <p className="mt-2 text-sm text-fg-muted">
          WoW считается только по сопоставимым публикациям того же аккаунта. При смешанном источнике
          демо/API цифры не складываются в «фейковый рост».
        </p>
        <Button
          className="mt-4"
          variant="secondary"
          onClick={async () => {
            const res = await grokExplain({
              data: {
                kind: "daily",
                payload: JSON.stringify({
                  funnel: data.funnel,
                  fatigue: data.fatigue,
                  viral: data.viralAlerts.slice(0, 3),
                }),
              },
            });
            setWeekly(res.ok ? res.text : res.error);
          }}
        >
          Собрать weekly explanation
        </Button>
        {weekly ? <p className="mt-3 whitespace-pre-wrap text-sm text-fg-muted">{weekly}</p> : null}
      </section>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-fg-subtle">{k}</dt>
      <dd className="mt-1">{v}</dd>
    </div>
  );
}
