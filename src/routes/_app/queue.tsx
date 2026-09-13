import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Skeleton } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_RU, TASK_RU } from "@/lib/labels";
import { tickScheduler } from "@/lib/server/workspace";
import { useWorkspace } from "@/lib/use-workspace";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/queue")({ component: QueuePage });

function QueuePage() {
  const { data, reload } = useWorkspace();
  if (!data) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Isolation"
        title="Живые очереди"
        actions={
          <Button
            variant="secondary"
            onClick={async () => {
              const r = await tickScheduler();
              toast.message(`Обработано ${r.processed}`);
              await reload();
            }}
          >
            Прогнать планировщик
          </Button>
        }
      />
      <p className="text-sm text-fg-muted">
        Ошибка одного аккаунта не блокирует остальные. Повторная публикация одной task блокируется idempotency key.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {data.accounts.map((a) => {
          const items = data.tasks.filter((t) => t.accountId === a.id && t.status !== "published");
          return (
            <section key={a.id} className="panel p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold">@{a.handle}</h2>
                <Badge tone={a.status === "ERROR" ? "danger" : a.status === "PAUSED" ? "warn" : "ok"}>
                  {STATUS_RU[a.status]}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-fg-subtle">
                каждые {a.intervalHours}ч · {items.length} в очереди
              </p>
              <ul className="mt-3 space-y-2">
                {items.slice(0, 8).map((t) => {
                  const v = data.videos.find((x) => x.id === t.videoId);
                  return (
                    <li key={t.id} className="rounded-[var(--radius-sm)] bg-bg px-3 py-2 text-xs">
                      <p>{v?.title}</p>
                      <p className="text-fg-subtle">
                        {new Date(t.scheduledAt).toLocaleString("ru-RU")} · {TASK_RU[t.status]}
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
