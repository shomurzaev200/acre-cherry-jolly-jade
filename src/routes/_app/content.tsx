import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/kpi";
import { VideoThumb } from "@/components/thumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { massAssign } from "@/lib/server/workspace";
import { useWorkspace } from "@/lib/use-workspace";

export const Route = createFileRoute("/_app/content")({ component: ContentPage });

function ContentPage() {
  const { data, reload } = useWorkspace();
  const [picked, setPicked] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  if (!data) return <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-bg-subtle" />;

  function toggle(list: string[], id: string, set: (v: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Library"
        title="Контент"
        actions={
          <Link to="/upload" className="text-sm text-fg-muted hover:text-fg">
            Загрузить
          </Link>
        }
      />
      <div className="panel flex flex-wrap items-center gap-2 p-4">
        <Button size="sm" variant="secondary" onClick={() => setAccounts(data.accounts.map((a) => a.id))}>
          All accounts
        </Button>
        {data.accounts.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => toggle(accounts, a.id, setAccounts)}
            className={`h-8 rounded-full border px-3 text-xs ${accounts.includes(a.id) ? "border-teal text-teal" : "border-line text-fg-muted"}`}
          >
            @{a.handle}
          </button>
        ))}
        <Button
          size="sm"
          disabled={!picked.length || !accounts.length}
          onClick={async () => {
            const res = await massAssign({ data: { videoIds: picked, accountIds: accounts } });
            setMsg(res.ok ? `Создано задач: ${res.created}` : "Ошибка");
            await reload();
          }}
        >
          Mass assign
        </Button>
        {msg ? <span className="text-xs text-fg-muted">{msg}</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {data.videos.map((v) => {
          const an = data.scored.find((s) => s.videoId === v.id);
          const selected = picked.includes(v.id);
          return (
            <article key={v.id} className="panel overflow-hidden">
              <button type="button" className="block w-full" onClick={() => toggle(picked, v.id, setPicked)}>
                <VideoThumb seed={v.thumbnailSeed} title={v.title} className="aspect-[4/5]" />
              </button>
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={selected ? "teal" : "neutral"}>{selected ? "Selected" : v.topicCluster}</Badge>
                  <span className="font-mono text-[11px] text-fg-subtle">{v.durationSec}s</span>
                </div>
                <Link to="/content/$id" params={{ id: v.id }} className="block text-sm font-medium hover:text-teal">
                  {v.title}
                </Link>
                <p className="text-xs text-fg-muted">
                  {v.hookStyle} · score {an?.performanceScore ?? "—"}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
