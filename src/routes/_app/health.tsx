import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { healthCheck, logsFor } from "@/lib/server/workspace";

export const Route = createFileRoute("/_app/health")({ component: HealthPage });

function HealthPage() {
  const [health, setHealth] = useState<Awaited<ReturnType<typeof healthCheck>> | null>(null);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof logsFor>>>([]);

  useEffect(() => {
    void healthCheck().then(setHealth);
    void logsFor({ data: null }).then(setLogs);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader kicker="Observability" title="Состояние системы" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {health
          ? Object.entries(health).map(([k, v]) => (
              <div key={k} className="panel p-4">
                <p className="text-[11px] uppercase tracking-wider text-fg-subtle">{k}</p>
                <div className="mt-2">
                  <Badge tone={v === "ok" ? "ok" : v === "unavailable" || v === "N/A" || v === "not_connected" ? "warn" : "danger"}>
                    {v}
                  </Badge>
                </div>
              </div>
            ))
          : <div className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-bg-subtle" />}
      </div>
      <section className="panel p-5">
        <h2 className="font-display font-semibold">Журнал аудита</h2>
        <ul className="mt-3 space-y-2 text-xs">
          {logs.map((l) => (
            <li key={l.id} className="flex flex-wrap justify-between gap-2 border-b border-line/50 pb-2">
              <span>
                {l.actor} · {l.action} · {l.target} {l.detail}
              </span>
              <span className="text-fg-subtle">{l.created_at}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
