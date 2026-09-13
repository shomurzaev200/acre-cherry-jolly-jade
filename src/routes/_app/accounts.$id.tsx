import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Funnel } from "@/components/funnel";
import { PageHeader } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { funnelFrom } from "@/lib/engine";
import { formatCompact, formatPct, hourLabel } from "@/lib/format";
import { connectMetaAccount, deleteAccount, setAccountMode, setAccountStatus } from "@/lib/server/workspace";
import type { IgAccount } from "@/lib/types";
import { useWorkspace } from "@/lib/use-workspace";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/accounts/$id")({ component: AccountPage });

const TABS = [
  { id: "Overview", label: "Обзор" },
  { id: "Content", label: "Контент" },
  { id: "Schedule", label: "Расписание" },
  { id: "Queue", label: "Очередь" },
  { id: "Analytics", label: "Аналитика" },
  { id: "AI Intelligence", label: "AI" },
  { id: "Experiments", label: "Эксперименты" },
  { id: "Network", label: "Сеть" },
  { id: "Logs", label: "Логи" },
  { id: "Settings", label: "Настройки" },
] as const;

function AccountPage() {
  const { id } = Route.useParams();
  const { data, reload } = useWorkspace();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("Overview");
  const acc = data?.accounts.find((a) => a.id === id);
  const prof = data?.profiles.find((p) => p.accountId === id);
  const tasks = useMemo(() => data?.tasks.filter((t) => t.accountId === id) ?? [], [data, id]);
  const scored = useMemo(() => data?.scored.filter((s) => s.accountId === id) ?? [], [data, id]);
  const analytics = useMemo(() => data?.analytics.filter((a) => a.accountId === id) ?? [], [data, id]);
  const experiments = data?.experiments.filter((e) => e.accountId === id) ?? [];
  const net = data?.networks.find((n) => n.id === acc?.networkProfileId);

  if (!data) return <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-bg-subtle" />;
  if (!acc) return <p className="text-sm text-fg-muted">Аккаунт не найден.</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Account"
        title={`@${acc.handle}`}
        actions={
          <div className="flex gap-2">
            <Badge tone={acc.status === "ACTIVE" ? "ok" : "warn"}>{acc.status}</Badge>
            <Badge>{acc.mode}</Badge>
          </div>
        }
      />
      <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`h-9 shrink-0 rounded-full px-3 text-xs ${tab === t.id ? "bg-bg-subtle text-fg" : "text-fg-muted hover:text-fg"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel p-5">
            <p className="text-[11px] uppercase tracking-widest text-fg-subtle">AI Profile</p>
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="Best hours" v={prof?.bestHours.map(hourLabel).join(" · ") || "Insufficient historical data"} />
              <Row k="Best days" v={prof?.bestDays.join(", ") || "—"} />
              <Row k="Best length" v={prof?.bestLengthMin ? `${prof.bestLengthMin}–${prof.bestLengthMax} sec` : "—"} />
              <Row k="Best topics" v={prof?.bestTopics.join(", ") || "—"} />
              <Row k="Best hook" v={prof?.bestHooks.join(", ") || "—"} />
              <Row k="Best CTA" v={prof?.bestCta || "—"} />
              <Row k="Hashtag cluster" v={prof?.bestHashtagCluster || "—"} />
              <Row k="Profile visit rate" v={formatPct(prof?.profileVisitRate)} />
              <Row k="Link click rate" v={formatPct(prof?.linkClickRate)} />
              <Row k="AI confidence" v={`${prof?.confidence ?? 0}% · n=${prof?.sampleSize ?? 0}`} />
            </dl>
            <p className="mt-4 text-xs text-fg-muted">{prof?.notes}</p>
          </div>
          <Funnel data={funnelFrom(analytics)} />
        </div>
      ) : null}

      {tab === "Content" ? (
        <ul className="grid gap-2">
          {scored.slice(0, 12).map((s) => (
            <li key={s.taskId} className="panel flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <Link to="/content/$id" params={{ id: s.videoId }} className="hover:text-cyan">
                {s.title}
              </Link>
              <span className="font-mono tabular text-fg-muted">{formatCompact(s.views)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "Schedule" || tab === "Queue" ? (
        <ul className="space-y-2">
          {tasks
            .filter((t) => (tab === "Queue" ? t.status !== "published" : true))
            .slice(0, 20)
            .map((t) => {
              const v = data.videos.find((x) => x.id === t.videoId);
              return (
                <li key={t.id} className="panel flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span>{v?.title}</span>
                  <span className="text-fg-muted">
                    {new Date(t.scheduledAt).toLocaleString("ru-RU")} · {t.status}
                  </span>
                </li>
              );
            })}
        </ul>
      ) : null}

      {tab === "Analytics" ? (
        <div className="overflow-x-auto panel">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-fg-subtle">
              <tr className="border-b border-line">
                <th className="px-4 py-2 text-left">Video</th>
                <th>Views</th>
                <th>Reach</th>
                <th>Profile</th>
                <th>Link</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {scored.map((s) => (
                <tr key={s.taskId} className="border-b border-line/60">
                  <td className="px-4 py-2">{s.title}</td>
                  <td className="px-3 py-2 font-mono tabular text-center">{formatCompact(s.views)}</td>
                  <td className="px-3 py-2 font-mono tabular text-center">{formatCompact(s.reach)}</td>
                  <td className="px-3 py-2 font-mono tabular text-center">{formatCompact(s.profileVisits)}</td>
                  <td className="px-3 py-2 font-mono tabular text-center">{formatCompact(s.linkClicks)}</td>
                  <td className="px-3 py-2 font-mono tabular text-center">{s.performanceScore ?? "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "AI Intelligence" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="panel p-5">
            <h3 className="font-display font-semibold">Do more</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-fg-muted">
              {(prof?.doMore ?? []).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="panel p-5">
            <h3 className="font-display font-semibold">Do less</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-fg-muted">
              {(prof?.doLess ?? []).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {tab === "Experiments" ? (
        <ul className="space-y-3">
          {experiments.map((e) => (
            <li key={e.id} className="panel p-4 text-sm">
              <p className="font-medium">
                {e.name} · {e.status}
                {e.winner ? ` · winner ${e.winner}` : ""}
              </p>
              <p className="mt-1 text-fg-muted">{e.notes}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "Network" ? (
        <div className="panel p-5 text-sm">
          <p>{net?.name ?? "Не назначен"} · {net?.status ?? "—"} · {net?.latencyMs ? `${net.latencyMs} ms` : "latency N/A"}</p>
          <p className="mt-2 text-fg-muted">
            Network profile — легитимная маршрутизация. Не используется для обхода блокировок, CAPTCHA или 2FA.
          </p>
          {net?.warning ? <p className="mt-2 text-warn">{net.warning}</p> : null}
        </div>
      ) : null}

      {tab === "Logs" ? (
        <p className="text-sm text-fg-muted">Системные события пишутся в audit log при Pause / Approve / Assign / Tick.</p>
      ) : null}

      {tab === "Settings" ? (
        <AccountSettings acc={acc} reload={reload} />
      ) : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-fg-subtle">{k}</dt>
      <dd className="max-w-[60%] text-right">{v}</dd>
    </div>
  );
}

function AccountSettings({ acc, reload }: { acc: IgAccount; reload: () => Promise<void> }) {
  const navigate = useNavigate();
  const [igId, setIgId] = useState(acc.igBusinessId ?? "");
  const [token, setToken] = useState("");

  return (
    <div className="space-y-4">
      <div className="panel space-y-3 p-5 text-sm">
        <p className="font-medium">Официальный Meta Graph API</p>
        <p className="text-fg-muted">
          Пароль Instagram не принимается. Нужен Instagram Business/Creator + long-lived token из Graph Explorer.
          Сейчас: {acc.metaConnected ? `подключён ${acc.metaTokenHint}` : "не подключён — посты не уйдут в IG"}.
        </p>
        <Input placeholder="IG Business Account ID" value={igId} onChange={(e) => setIgId(e.target.value)} />
        <Input type="password" placeholder="Access token" value={token} onChange={(e) => setToken(e.target.value)} />
        <Button
          onClick={async () => {
            const r = await connectMetaAccount({ data: { id: acc.id, igBusinessId: igId, accessToken: token } });
            if (!r.ok) toast.error(r.error);
            else {
              toast.success("Токен сохранён");
              setToken("");
              await reload();
            }
          }}
        >
          Сохранить токен
        </Button>
      </div>
      <div className="panel flex flex-wrap gap-2 p-5">
        <Button
          variant="secondary"
          onClick={async () => {
            await setAccountStatus({ data: { id: acc.id, status: acc.status === "PAUSED" ? "ACTIVE" : "PAUSED" } });
            await reload();
          }}
        >
          {acc.status === "PAUSED" ? "Возобновить аккаунт" : "Пауза аккаунта"}
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            await setAccountMode({
              data: {
                id: acc.id,
                mode: acc.mode === "AUTOPILOT" ? "MANUAL" : "AUTOPILOT",
                requireApproval: acc.mode === "AUTOPILOT",
              },
            });
            await reload();
          }}
        >
          {acc.mode === "AUTOPILOT" ? "Перейти на ручной AI" : "Включить автопилот"}
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            if (!window.confirm(`Удалить @${acc.handle}?`)) return;
            const r = await deleteAccount({ data: { id: acc.id } });
            if (!r.ok) toast.error(r.error);
            else {
              toast.success("Удалён");
              await navigate({ to: "/accounts" });
            }
          }}
        >
          Удалить аккаунт
        </Button>
      </div>
    </div>
  );
}
