import { Link, createFileRoute } from "@tanstack/react-router";
import { DataBanner } from "@/components/data-banner";
import { Funnel } from "@/components/funnel";
import { Kpi, PageHeader, Skeleton } from "@/components/kpi";
import { StatusDot } from "@/components/status-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { diagnoseFunnel } from "@/lib/engine";
import { formatCompact, formatPct, hourLabel } from "@/lib/format";
import { STATUS_RU } from "@/lib/labels";
import { acceptRecommendation, pauseAll, tickScheduler } from "@/lib/server/workspace";
import { useWorkspace } from "@/lib/use-workspace";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/")({ component: Dashboard });

function Dashboard() {
  const { data, error, loading, reload } = useWorkspace();

  if (loading || !data) return <Skeleton className="h-64" />;
  if (error) return <p className="text-sm text-danger">{error}</p>;

  const diag = diagnoseFunnel(data.funnel);
  const pending = data.tasks.filter((t) => t.status === "pending_approval").length;
  const ingestHint =
    data.videos.length < 4
      ? `В библиотеке ${data.videos.length} роликов. Цель — минимум 4 в день.`
      : `${data.videos.length} роликов в библиотеке`;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="AI Command Center"
        title="Обзор"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                const r = await tickScheduler();
                toast.message(`Планировщик: обработано ${r.processed}`);
                await reload();
              }}
            >
              Прогнать очередь
            </Button>
            <Button
              variant={data.pausedAll ? "primary" : "danger"}
              onClick={async () => {
                await pauseAll({ data: !data.pausedAll });
                toast.message(data.pausedAll ? "Публикации возобновлены" : "Все очереди на паузе");
                await reload();
              }}
            >
              {data.pausedAll ? "Возобновить все" : "Пауза всех"}
            </Button>
          </div>
        }
      />
      <DataBanner />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Kpi label="Аккаунты" value={data.accounts.length} hint={`${data.accounts.filter((a) => a.status === "ACTIVE").length} активны`} />
        <Kpi label="Пауза" value={data.accounts.filter((a) => a.status === "PAUSED").length + (data.pausedAll ? 1 : 0)} tone="fg" />
        <Kpi label="Видео" value={data.videos.length} hint={ingestHint} />
        <Kpi label="Очередь" value={data.queueDepth} />
        <Kpi label="Сегодня" value={data.todayPublished} hint="опубликовано" />
        <Kpi label="Просмотры" value={data.funnel.views} />
        <Kpi label="В профиль" value={data.funnel.profileVisits} tone="violet" />
        <Kpi label="По ссылке" value={data.funnel.linkClicks} warn={data.errors > 0} tone="pink" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Funnel data={data.funnel} />
        <div className="panel p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-violet">Где теряем</p>
          <h2 className="mt-1 font-display text-lg font-semibold">{diag.headline}</h2>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">{diag.detail}</p>
          <p className="mt-3 text-sm text-fg">{diag.action}</p>
          {pending ? (
            <Link to="/approvals" className="mt-4 inline-flex text-sm text-cyan hover:underline">
              {pending} публикаций ждут approve
            </Link>
          ) : null}
        </div>
      </div>

      {data.viralAlerts.length ? (
        <div className="panel border-pink/30 p-5">
          <div className="flex items-center gap-2">
            <Badge tone="pink">Viral alert</Badge>
            <p className="text-sm text-fg-muted">AI зафиксировал выброс. Копии ролика не публикуются.</p>
          </div>
          <ul className="mt-3 space-y-2">
            {data.viralAlerts.slice(0, 3).map((v) => (
              <li key={v.taskId} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span>
                  @{v.handle} · {v.title}
                </span>
                <span className="font-mono tabular text-pink">{formatCompact(v.views)} views</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Рекомендации на сегодня</h2>
            <Link to="/intelligence" className="text-xs text-fg-muted hover:text-cyan">
              Все
            </Link>
          </div>
          <ol className="space-y-3">
            {data.recommendations.slice(0, 6).map((r, i) => (
              <li key={r.id} className="flex gap-3">
                <span className="font-mono text-xs text-violet">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{r.body}</p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {r.reason} · уверенность {r.confidence}%
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={r.accepted ? "secondary" : "ai"}
                  onClick={async () => {
                    await acceptRecommendation({ data: { id: r.id, accepted: true } });
                    await reload();
                  }}
                >
                  {r.accepted ? "Принято" : "Принять"}
                </Button>
              </li>
            ))}
          </ol>
        </div>

        <div className="panel overflow-hidden p-0">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-display text-lg font-semibold">Аккаунты</h2>
            <Link to="/accounts" className="text-xs text-fg-muted hover:text-cyan">
              Сравнить
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-fg-subtle">
                <tr className="border-y border-line">
                  <th className="px-5 py-2 font-medium">Аккаунт</th>
                  <th className="px-3 py-2 font-medium">Views</th>
                  <th className="px-3 py-2 font-medium">Профиль</th>
                  <th className="px-3 py-2 font-medium">Ссылка</th>
                  <th className="px-3 py-2 font-medium">Conv.</th>
                  <th className="px-5 py-2 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.map((a) => {
                  const rows = data.scored.filter((s) => s.accountId === a.id);
                  const views = rows.reduce((n, r) => n + (r.views ?? 0), 0);
                  const pv = rows.reduce((n, r) => n + (r.profileVisits ?? 0), 0);
                  const lc = rows.reduce((n, r) => n + (r.linkClicks ?? 0), 0);
                  const conv = views ? pv / views : null;
                  const prof = data.profiles.find((p) => p.accountId === a.id);
                  return (
                    <tr key={a.id} className="border-b border-line/50 hover:bg-bg-subtle/60">
                      <td className="px-5 py-2.5">
                        <Link to="/accounts/$id" params={{ id: a.id }} className="hover:text-cyan">
                          @{a.handle}
                        </Link>
                        <p className="text-[11px] text-fg-subtle">
                          слот {prof?.bestHours[0] != null ? hourLabel(prof.bestHours[0]) : "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular">{formatCompact(views)}</td>
                      <td className="px-3 py-2.5 font-mono tabular">{formatCompact(pv)}</td>
                      <td className="px-3 py-2.5 font-mono tabular">{formatCompact(lc)}</td>
                      <td className="px-3 py-2.5 font-mono tabular">{formatPct(conv)}</td>
                      <td className="px-5 py-2.5">
                        <StatusDot
                          tone={a.status === "ACTIVE" ? "ok" : a.status === "PAUSED" ? "warn" : "danger"}
                          label={STATUS_RU[a.status]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="panel p-5">
          <h2 className="font-display text-lg font-semibold">Живая лента</h2>
          <ul className="mt-3 space-y-3">
            {data.notifications.slice(0, 8).map((n) => (
              <li key={n.id} className="flex gap-3 text-sm">
                <StatusDot
                  tone={n.kind === "viral" ? "danger" : n.kind === "fatigue" ? "warn" : "cyan"}
                />
                <div>
                  <p>{n.title}</p>
                  <p className="text-xs text-fg-muted">{n.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-5">
          <h2 className="font-display text-lg font-semibold">Следующий слот по аккаунтам</h2>
          <ul className="mt-3 space-y-2">
            {data.accounts.map((a) => {
              const next = data.tasks
                .filter((t) => t.accountId === a.id && (t.status === "queued" || t.status === "pending_approval"))
                .sort((x, y) => +new Date(x.scheduledAt) - +new Date(y.scheduledAt))[0];
              const prof = data.profiles.find((p) => p.accountId === a.id);
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-bg px-3 py-2 text-sm">
                  <span>@{a.handle}</span>
                  <span className="font-mono text-xs text-cyan">
                    {next
                      ? new Date(next.scheduledAt).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
                      : prof?.bestHours[0] != null
                        ? `рекомендация ${hourLabel(prof.bestHours[0])}`
                        : "нет слота"}
                  </span>
                </li>
              );
            })}
          </ul>
          <Link to="/upload" className="mt-4 inline-flex text-sm text-cyan hover:underline">
            Загрузить минимум 4 видео и назначить слоты
          </Link>
        </div>
      </div>
    </div>
  );
}
