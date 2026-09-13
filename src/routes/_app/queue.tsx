import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tickScheduler } from "@/lib/server/workspace";
import { useWorkspace } from "@/lib/use-workspace";

export const Route = createFileRoute("/_app/queue")({ component: QueuePage });

function QueuePage() {
  const { data, reload } = useWorkspace();
  if (!data) return <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-bg-subtle" />;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Isolation"
        title="Очереди"
        actions={
          <Button
            variant="secondary"
            onClick={async () => {
              await tickScheduler();
              await reload();
            }}
          >
            Tick
          </Button>
        }
      />
      <p className="text-sm text-fg-muted">
        Ошибка одного аккаунта не блокирует остальные. Duplicate protection через idempotency key.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {data.accounts.map((a) => {
          const items = data.tasks.filter((t) => t.accountId === a.id && t.status !== "published");
          return (
            <section key={a.id} className="panel p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold">@{a.handle}</h2>
                <Badge tone={a.status === "ERROR" ? "danger" : "ok"}>{a.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-fg-subtle">every {a.intervalHours}h · {items.length} in queue</p>
              <ul className="mt-3 space-y-2">
                {items.slice(0, 8).map((t) => {
                  const v = data.videos.find((x) => x.id === t.videoId);
                  return (
                    <li key={t.id} className="rounded-[var(--radius-sm)] bg-bg px-3 py-2 text-xs">
                      <p>{v?.title}</p>
                      <p className="text-fg-subtle">
                        {new Date(t.scheduledAt).toLocaleString("ru-RU")} · {t.status}
                      </p>
                    </li>
                  );
                })}
                {!items.length ? <li className="text-xs text-fg-subtle">Пусто</li> : null}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
