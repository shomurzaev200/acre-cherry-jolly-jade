import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/kpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addVideo } from "@/lib/server/workspace";
import { useWorkspace } from "@/lib/use-workspace";

export const Route = createFileRoute("/_app/upload")({ component: UploadPage });

function UploadPage() {
  const { reload } = useWorkspace();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("18");
  const [topic, setTopic] = useState("Hook craft");
  const [hook, setHook] = useState("Question");
  const [cluster, setCluster] = useState("A");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader kicker="Ingest" title="Загрузка" />
      <form
        className="panel grid max-w-xl gap-3 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await addVideo({
            data: {
              title,
              durationSec: Number(duration) || 18,
              topic,
              hookStyle: hook,
              cluster,
            },
          });
          setMsg(res.ok ? "Видео добавлено, AI analysis записан (hash reuse)." : "Ошибка");
          setTitle("");
          await reload();
        }}
      >
        <label className="text-xs text-fg-muted">
          Название
          <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="text-xs text-fg-muted">
          Длительность, сек
          <Input className="mt-1" type="number" min={5} max={90} value={duration} onChange={(e) => setDuration(e.target.value)} />
        </label>
        <label className="text-xs text-fg-muted">
          Тема
          <Input className="mt-1" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </label>
        <label className="text-xs text-fg-muted">
          Hook style
          <Input className="mt-1" value={hook} onChange={(e) => setHook(e.target.value)} />
        </label>
        <label className="text-xs text-fg-muted">
          Topic cluster (A–D)
          <Input className="mt-1" value={cluster} onChange={(e) => setCluster(e.target.value)} />
        </label>
        <Button type="submit">AI Analyze + сохранить</Button>
        {msg ? <p className="text-xs text-fg-muted">{msg}</p> : null}
      </form>
      <p className="max-w-xl text-xs text-fg-subtle">
        Bulk upload на VPS идёт через worker + S3-compatible storage. В превью сохраняется metadata и
        локальный AI-анализ без повторных запросов при том же hash. Медиафайлы не кладутся в Postgres.
      </p>
    </div>
  );
}
