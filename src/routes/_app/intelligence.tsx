import { Link, createFileRoute } from "@tanstack/react-router";
import { PageHeader, Skeleton } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { formatCompact, hourLabel } from "@/lib/format";
import { daysRu } from "@/lib/labels";
import { acceptRecommendation } from "@/lib/server/workspace";
import { useWorkspace } from "@/lib/use-workspace";

export const Route = createFileRoute("/_app/intelligence")({ component: IntelPage });

function IntelPage() {
  const { data, reload } = useWorkspace();
  if (!data) return <Skeleton className="h-40" />;
  const best = data.scored.filter((s) => s.views != null).slice(0, 5);
  const worst = [...data.scored]
    .filter((s) => s.views != null)
    .sort((a, b) => (a.views ?? 0) - (b.views ?? 0))
    .slice(0, 5);
  const avgScore =
    data.scored.filter((s) => s.performanceScore != null).reduce((n, s) => n + (s.performanceScore ?? 0), 0) /
    Math.max(1, data.scored.filter((s) => s.performanceScore != null).length);

  return (
    <div className="space-y-6">
      <PageHeader kicker="Learning loop" title="AI Intelligence" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-violet">AI Performance Score</p>
          <p className="mt-2 font-mono text-4xl ai-glow text-violet">{Math.round(avgScore) || "—"}</p>
          <p className="mt-2 text-xs text-fg-muted">Взвешенно: views, reach, profile visits, link clicks</p>
        </div>
        <div className="panel p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-cyan">Статус контура</p>
          <p className="mt-2 font-display text-xl">Наблюдает → учится → рекомендует</p>
          <p className="mt-2 text-xs text-fg-muted">Один ролик не меняет стратегию. Minimum sample size.</p>
        </div>
        <div className="panel p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-pink">Viral / fatigue</p>
          <p className="mt-2 text-sm">{data.viralAlerts.length} выбросов · {data.fatigue.length} усталость темы</p>
          {data.fatigue[0] ? <p className="mt-2 text-xs text-warn">{data.fatigue[0].message}</p> : null}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <List title="Лучшие ролики" rows={best} />
        <List title="Худшие ролики" rows={worst} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.profiles.map((p) => {
          const acc = data.accounts.find((a) => a.id === p.accountId);
          return (
            <div key={p.accountId} className="panel p-4 text-sm">
              <p className="font-display font-semibold">@{acc?.handle}</p>
              <p className="mt-2 text-xs text-cyan">Часы {p.bestHours.map(hourLabel).join(" ") || "мало данных"}</p>
              <p className="text-xs text-fg-muted">Дни {daysRu(p.bestDays) || "—"}</p>
              <p className="text-xs text-fg-muted">Hooks {p.bestHooks.join(", ") || "—"}</p>
              <p className="text-xs text-fg-muted">CTA {p.bestCta || "—"}</p>
              <p className="mt-2 text-xs text-violet">Уверенность {p.confidence}% · n={p.sampleSize}</p>
              <p className="mt-2 text-xs text-ok">Делать: {p.doMore.slice(0, 2).join(" · ")}</p>
              <p className="text-xs text-danger">Меньше: {p.doLess.slice(0, 2).join(" · ")}</p>
            </div>
          );
        })}
      </div>
      <div className="panel p-5">
        <h2 className="font-display text-lg font-semibold">Рекомендации</h2>
        <ul className="mt-3 space-y-3">
          {data.recommendations.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-line/60 pb-3 text-sm">
              <div>
                <p>{r.body}</p>
                <p className="text-xs text-fg-muted">
                  {r.reason} · {r.confidence}%
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-cyan"
                onClick={async () => {
                  await acceptRecommendation({ data: { id: r.id, accepted: true } });
                  await reload();
                }}
              >
                {r.accepted ? "Принято" : "Принять"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function List({
  title,
  rows,
}: {
  title: string;
  rows: { taskId: string; videoId: string; handle: string; title: string; views: number | null; outlier: string }[];
}) {
  return (
    <div className="panel p-5">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.taskId} className="flex items-center justify-between gap-2 text-sm">
            <Link to="/content/$id" params={{ id: r.videoId }} className="hover:text-cyan">
              @{r.handle} · {r.title}
            </Link>
            <span className="flex items-center gap-2">
              {r.outlier === "viral" ? <Badge tone="pink">viral</Badge> : null}
              {r.outlier === "under" ? <Badge tone="warn">слабо</Badge> : null}
              <span className="font-mono tabular">{formatCompact(r.views)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
