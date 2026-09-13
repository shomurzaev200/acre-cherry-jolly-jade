import { Link, createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { formatCompact, hourLabel } from "@/lib/format";
import { acceptRecommendation } from "@/lib/server/workspace";
import { useWorkspace } from "@/lib/use-workspace";

export const Route = createFileRoute("/_app/intelligence")({ component: IntelPage });

function IntelPage() {
  const { data, reload } = useWorkspace();
  if (!data) return <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-bg-subtle" />;
  const best = data.scored.filter((s) => s.views != null).slice(0, 5);
  const worst = [...data.scored].filter((s) => s.views != null).sort((a, b) => (a.views ?? 0) - (b.views ?? 0)).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader kicker="Learning loop" title="AI Intelligence" />
      <div className="grid gap-4 lg:grid-cols-2">
        <List title="Best performing" rows={best} />
        <List title="Worst performing" rows={worst} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.profiles.map((p) => {
          const acc = data.accounts.find((a) => a.id === p.accountId);
          return (
            <div key={p.accountId} className="panel p-4 text-sm">
              <p className="font-display font-semibold">@{acc?.handle}</p>
              <p className="mt-2 text-xs text-fg-muted">Hours {p.bestHours.map(hourLabel).join(" ")}</p>
              <p className="text-xs text-fg-muted">Hooks {p.bestHooks.join(", ") || "—"}</p>
              <p className="text-xs text-fg-muted">CTA {p.bestCta || "—"}</p>
              <p className="mt-2 text-xs">Confidence {p.confidence}%</p>
            </div>
          );
        })}
      </div>
      <div className="panel p-5">
        <h2 className="font-display text-lg font-semibold">Recommendations</h2>
        <ul className="mt-3 space-y-3">
          {data.recommendations.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-line/60 pb-3 text-sm">
              <div>
                <p>{r.body}</p>
                <p className="text-xs text-fg-muted">{r.reason} · {r.confidence}%</p>
              </div>
              <button
                type="button"
                className="text-xs text-teal"
                onClick={async () => {
                  await acceptRecommendation({ data: { id: r.id, accepted: true } });
                  await reload();
                }}
              >
                {r.accepted ? "Accepted" : "Accept"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function List({ title, rows }: { title: string; rows: { taskId: string; videoId: string; handle: string; title: string; views: number | null; outlier: string }[] }) {
  return (
    <div className="panel p-5">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.taskId} className="flex items-center justify-between gap-2 text-sm">
            <Link to="/content/$id" params={{ id: r.videoId }} className="hover:text-teal">
              @{r.handle} · {r.title}
            </Link>
            <span className="flex items-center gap-2">
              {r.outlier === "viral" ? <Badge tone="teal">viral</Badge> : null}
              {r.outlier === "under" ? <Badge tone="warn">under</Badge> : null}
              <span className="font-mono tabular">{formatCompact(r.views)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
