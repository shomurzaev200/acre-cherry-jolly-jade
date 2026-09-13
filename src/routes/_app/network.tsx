import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/lib/use-workspace";

export const Route = createFileRoute("/_app/network")({ component: NetworkPage });

function NetworkPage() {
  const { data } = useWorkspace();
  if (!data) return <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-bg-subtle" />;

  return (
    <div className="space-y-6">
      <PageHeader kicker="Routing" title="Network profiles" />
      <div className="panel border-warn/30 p-4 text-sm text-fg-muted">
        Профили нужны для легитимной сетевой изоляции. Запрещено: обход блокировок, CAPTCHA, 2FA,
        украденные cookies/session, массовые бесплатные публичные proxy как защита от банов.
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {data.networks.map((n) => (
          <article key={n.id} className="panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold">{n.name}</h2>
              <Badge tone={n.status === "HEALTHY" ? "ok" : n.status === "WARNING" ? "warn" : "danger"}>
                {n.status}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-fg-muted">{n.region}</p>
            <p className="mt-1 font-mono text-xs text-fg-subtle">{n.proxyKind === "none" ? "direct" : n.proxyHost || n.proxyKind}</p>
            <p className="mt-3 text-sm">Latency {n.latencyMs ?? "N/A"} ms</p>
            {n.proxyKind === "free" ? (
              <p className="mt-2 text-xs text-warn">Free proxy may be unstable or insecure.</p>
            ) : null}
            {n.warning ? <p className="mt-2 text-xs text-fg-muted">{n.warning}</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
