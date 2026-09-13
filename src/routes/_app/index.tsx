import { Link, createFileRoute } from "@tanstack/react-router";
import { DataBanner } from "@/components/data-banner";
import { Funnel } from "@/components/funnel";
import { Kpi, PageHeader } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { diagnoseFunnel } from "@/lib/engine";
import { formatCompact, formatPct } from "@/lib/format";
import {
  acceptRecommendation,
  pauseAll,
  tickScheduler,
} from "@/lib/server/workspace";
import { useWorkspace } from "@/lib/use-workspace";

export const Route = createFileRoute("/_app/")({ component: Dashboard });

function Dashboard() {
  const { data, error, loading, reload } = useWorkspace();

  if (loading || !data) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-lg)] bg-bg-subtle" />;
  }
  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  const diag = diagnoseFunnel(data.funnel);
  const pending = data.tasks.filter((t) => t.status === "pending_approval").length;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Command Center"
        title="Сегодня"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                await tickScheduler();
                await reload();
              }}
            >
              Tick scheduler
            </Button>
            <Button
              variant={data.pausedAll ? "primary" : "danger"}
              onClick={async () => {
                await pauseAll({ data: !data.pausedAll });
                await reload();
              }}
            >
              {data.pausedAll ? "Resume all" : "Pause all"}
            </Button>
          </div>
        }
      />
      <DataBanner />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Kpi label="Accounts" value={data.accounts.length} hint={`${data.accounts.filter((a) => a.status === "ACTIVE").length} active`} />
        <Kpi label="Paused" value={data.accounts.filter((a) => a.status === "PAUSED").length + (data.pausedAll ? 1 : 0)} />
        <Kpi label="Videos" value={data.videos.length} />
        <Kpi label="Queue" value={data.queueDepth} />
        <Kpi label="Published today" value={data.todayPublished} />
        <Kpi label="Views" value={data.funnel.views} />
        <Kpi label="Profile visits" value={data.funnel.profileVisits} />
        <Kpi label="Link clicks" value={data.funnel.linkClicks} warn={data.errors > 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Funnel data={data.funnel} />
        <div className="panel p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-subtle">Где теряем</p>
          <h2 className="mt-1 font-display text-lg font-semibold">{diag.headline}</h2>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">{diag.detail}</p>
          <p className="mt-3 text-sm text-fg">{diag.action}</p>
        </div>
      </div>

      {data.viralAlerts.length ? (
        <div className="panel border-teal/30 p-5">
          <div className="flex items-center gap-2">
            <Badge tone="teal">Viral alert</Badge>
            <p className="text-sm text-fg-muted">AI зафиксировал признаки. Копии ролика не публикуются.</p>
          </div>
          <ul className="mt-3 space-y-2">
            {data.viralAlerts.slice(0, 3).map((v) => (
              <li key={v.taskId} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span>
                  @{v.handle} · {v.title}
                </span>
                <span className="font-mono tabular text-teal">{formatCompact(v.views)} views</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Today's AI recommendations</h2>
            <Link to="/intelligence" className="text-xs text-fg-muted hover:text-fg">
              Все
            </Link>
          </div>
          <ol className="space-y-3">
            {data.recommendations.slice(0, 6).map((r, i) => (
              <li key={r.id} className="flex gap-3">
                <span className="font-mono text-xs text-fg-subtle">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{r.body}</p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {r.reason} · confidence {r.confidence}%
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={r.accepted ? "secondary" : "ghost"}
                  onClick={async () => {
                    await acceptRecommendation({ data: { id: r.id, accepted: true } });
                    await reload();
                  }}
                >
                  {r.accepted ? "Принято" : "Accept"}
                </Button>
              </li>
            ))}
          </ol>
        </div>

        <div className="panel overflow-hidden p-0">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-display text-lg font-semibold">Аккаунты</h2>
            <Link to="/accounts" className="text-xs text-fg-muted hover:text-fg">
              Сравнить
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-fg-subtle">
                <tr className="border-y border-line">
                  <th className="px-5 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 font-medium">Views</th>
                  <th className="px-3 py-2 font-medium">Profile</th>
                  <th className="px-3 py-2 font-medium">Link</th>
                  <th className="px-3 py-2 font-medium">Conv.</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.map((a) => {
                  const rows = data.scored.filter((s) => s.accountId === a.id);
                  const views = rows.reduce((n, r) => n + (r.views ?? 0), 0);
                  const pv = rows.reduce((n, r) => n + (r.profileVisits ?? 0), 0);
                  const lc = rows.reduce((n, r) => n + (r.linkClicks ?? 0), 0);
                  return (
                    <tr key={a.id} className="border-b border-line/70">
                      <td className="px-5 py-2.5">
                        <Link to="/accounts/$id" params={{ id: a.id }} className="hover:text-teal">
                          @{a.handle}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular">{formatCompact(views)}</td>
                      <td className="px-3 py-2.5 font-mono tabular">{formatCompact(pv)}</td>
                      <td className="px-3 py-2.5 font-mono tabular">{formatCompact(lc)}</td>
                      <td className="px-3 py-2.5 font-mono tabular">{formatPct(views ? pv / views : null)}</td>
                      <td className="px-5 py-2.5">
                        <Badge tone={a.status === "ACTIVE" ? "ok" : a.status === "ERROR" ? "danger" : "warn"}>
                          {a.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">Approvals</p>
          <p className="mt-2 font-mono text-2xl tabular">{pending}</p>
          <Link to="/approvals" className="mt-2 inline-block text-sm text-fg-muted hover:text-fg">
            Открыть очередь подтверждения
          </Link>
        </div>
        <div className="panel p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">Fatigue</p>
          {data.fatigue.length ? (
            <ul className="mt-2 space-y-1 text-sm text-fg-muted">
              {data.fatigue.map((f) => (
                <li key={f.accountId + f.topic}>
                  @{f.handle}: {f.topic}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-fg-muted">Повторов тем выше порога нет.</p>
          )}
        </div>
        <div className="panel p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">Режим</p>
          <p className="mt-2 text-sm text-fg-muted">
            {data.pausedAll ? "GLOBAL PAUSE" : "Сеть работает"} · роль {data.role}
          </p>
          <p className="mt-2 text-xs text-fg-subtle">
            Публикация только через официальный API. Scheduler tick не создаёт fake views.
          </p>
        </div>
      </div>
    </div>
  );
}
