import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/kpi";
import { VideoThumb } from "@/components/thumb";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { formatRange } from "@/lib/format";
import { approveTask, updateTaskCopy } from "@/lib/server/workspace";
import { useWorkspace } from "@/lib/use-workspace";

export const Route = createFileRoute("/_app/approvals")({ component: ApprovalsPage });

function ApprovalsPage() {
  const { data, reload } = useWorkspace();
  const [edits, setEdits] = useState<Record<string, { caption: string; hashtags: string; cta: string }>>({});
  if (!data) return <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-bg-subtle" />;
  const pending = data.tasks.filter((t) => t.status === "pending_approval");

  return (
    <div className="space-y-6">
      <PageHeader kicker="Human in the loop" title="Подтверждение публикаций" />
      {!pending.length ? <p className="text-sm text-fg-muted">Нет публикаций, ждущих подтверждения.</p> : null}
      <div className="space-y-4">
        {pending.map((t) => {
          const v = data.videos.find((x) => x.id === t.videoId);
          const acc = data.accounts.find((a) => a.id === t.accountId);
          const e = edits[t.id] ?? { caption: t.caption, hashtags: t.hashtags, cta: t.cta };
          return (
            <article key={t.id} className="panel grid gap-4 p-4 md:grid-cols-[140px_1fr]">
              {v ? <VideoThumb seed={v.thumbnailSeed} title={v.title} className="aspect-[4/5] rounded-[var(--radius-md)]" /> : null}
              <div className="space-y-2">
                <p className="text-sm">
                  @{acc?.handle} · {v?.title} · {new Date(t.scheduledAt).toLocaleString("ru-RU")}
                </p>
                <p className="text-xs text-fg-muted">
                  Predicted views {formatRange(t.predictedViewsLo, t.predictedViewsHi)} · profile{" "}
                  {formatRange(t.predictedProfileLo, t.predictedProfileHi)} · clicks{" "}
                  {formatRange(t.predictedClicksLo, t.predictedClicksHi)} · conf {t.predictionConfidence ?? "N/A"}%
                </p>
                <Textarea value={e.caption} onChange={(ev) => setEdits({ ...edits, [t.id]: { ...e, caption: ev.target.value } })} />
                <Input value={e.hashtags} onChange={(ev) => setEdits({ ...edits, [t.id]: { ...e, hashtags: ev.target.value } })} />
                <Input value={e.cta} onChange={(ev) => setEdits({ ...edits, [t.id]: { ...e, cta: ev.target.value } })} />
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={async () => {
                      await updateTaskCopy({ data: { id: t.id, ...e } });
                      await approveTask({ data: { id: t.id, action: "APPROVE" } });
                      await reload();
                    }}
                  >
                    Подтвердить
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await updateTaskCopy({ data: { id: t.id, ...e } });
                      await reload();
                    }}
                  >
                    Сохранить правки
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      await approveTask({ data: { id: t.id, action: "REJECT" } });
                      await reload();
                    }}
                  >
                    Отклонить
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
