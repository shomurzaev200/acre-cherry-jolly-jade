import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/lib/use-workspace";

export const Route = createFileRoute("/_app/experiments")({ component: ExperimentsPage });

function ExperimentsPage() {
  const { data } = useWorkspace();
  if (!data) return <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-bg-subtle" />;

  return (
    <div className="space-y-6">
      <PageHeader kicker="Controlled tests" title="Эксперименты" />
      <p className="text-sm text-fg-muted">
        Одна переменная за раз. При малой выборке — Inconclusive, без уверенных выводов.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {data.experiments.map((e) => {
          const acc = data.accounts.find((a) => a.id === e.accountId);
          const tone = e.status === "winner" ? "ok" : e.status === "inconclusive" ? "warn" : "neutral";
          return (
            <article key={e.id} className="panel p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold">{e.name}</h2>
                <Badge tone={tone}>{e.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-fg-subtle">@{acc?.handle} · {e.kind}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-[var(--radius-sm)] bg-bg p-3">
                  <p className="text-[11px] uppercase text-fg-subtle">A</p>
                  <p className="mt-1">{e.variantA}</p>
                  <p className="mt-2 font-mono text-xs">n={e.sampleA} · {e.metricA ?? "N/A"}</p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-bg p-3">
                  <p className="text-[11px] uppercase text-fg-subtle">B</p>
                  <p className="mt-1">{e.variantB}</p>
                  <p className="mt-2 font-mono text-xs">n={e.sampleB} · {e.metricB ?? "N/A"}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-fg-muted">Hold constant: {e.holdConstant}</p>
              <p className="mt-2 text-sm">{e.notes}</p>
              {e.winner ? <p className="mt-2 text-sm text-cyan">Победитель: {e.winner}</p> : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
