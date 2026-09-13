import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCompact, formatPct, hourLabel } from "@/lib/format";
import { addAccount, setAccountStatus } from "@/lib/server/workspace";
import { useWorkspace } from "@/lib/use-workspace";

export const Route = createFileRoute("/_app/accounts")({ component: AccountsPage });

function AccountsPage() {
  const { data, reload } = useWorkspace();
  const [handle, setHandle] = useState("");
  const [niche, setNiche] = useState("");
  const [interval, setInterval] = useState("6");
  if (!data) return <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-bg-subtle" />;

  return (
    <div className="space-y-6">
      <PageHeader kicker="Multi-account" title="Аккаунты" />
      <form
        className="panel grid gap-3 p-4 md:grid-cols-[1fr_1fr_120px_auto]"
        onSubmit={async (e) => {
          e.preventDefault();
          await addAccount({ data: { handle, niche, intervalHours: Number(interval) || 6 } });
          setHandle("");
          await reload();
        }}
      >
        <Input placeholder="@handle" value={handle} onChange={(e) => setHandle(e.target.value)} required />
        <Input placeholder="Ниша" value={niche} onChange={(e) => setNiche(e.target.value)} />
        <Input
          type="number"
          min={1}
          max={24}
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
          aria-label="Интервал, часов"
        />
        <Button type="submit">Add account</Button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.accounts.map((a) => {
          const prof = data.profiles.find((p) => p.accountId === a.id);
          const rows = data.scored.filter((s) => s.accountId === a.id);
          const views = rows.reduce((n, r) => n + (r.views ?? 0), 0);
          const net = data.networks.find((n) => n.id === a.networkProfileId);
          return (
            <article key={a.id} className="panel flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link to="/accounts/$id" params={{ id: a.id }} className="font-display text-lg font-semibold hover:text-teal">
                    @{a.handle}
                  </Link>
                  <p className="text-xs text-fg-muted">{a.niche}</p>
                </div>
                <Badge tone={a.status === "ACTIVE" ? "ok" : a.status === "PAUSED" ? "warn" : "danger"}>
                  {a.status}
                </Badge>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-fg-subtle">Followers</dt>
                  <dd className="font-mono tabular">{formatCompact(a.followers || null)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-fg-subtle">Views</dt>
                  <dd className="font-mono tabular">{formatCompact(views)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-fg-subtle">PVR</dt>
                  <dd className="font-mono tabular">{formatPct(prof?.profileVisitRate)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-fg-subtle">Interval</dt>
                  <dd className="font-mono tabular">every {a.intervalHours}h</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-fg-muted">
                Best hours: {prof?.bestHours.map(hourLabel).join(", ") || "insufficient data"} · AI {prof?.confidence ?? 0}%
              </p>
              <p className="mt-1 text-xs text-fg-subtle">
                {a.mode} · {a.requireApproval ? "require approval" : "autopilot schedule"} · net {net?.status ?? "—"}
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await setAccountStatus({
                      data: { id: a.id, status: a.status === "PAUSED" ? "ACTIVE" : "PAUSED" },
                    });
                    await reload();
                  }}
                >
                  {a.status === "PAUSED" ? "Resume" : "Pause"}
                </Button>
                <Link to="/accounts/$id" params={{ id: a.id }} className="text-sm text-fg-muted hover:text-fg">
                  Открыть
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
