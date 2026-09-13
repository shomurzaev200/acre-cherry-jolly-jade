import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Skeleton } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hourLabel } from "@/lib/format";
import { HOOK_OPTIONS, HOOK_RU } from "@/lib/labels";
import { ingestVideos, massAssign, previewAssign } from "@/lib/server/workspace";
import { useWorkspace } from "@/lib/use-workspace";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/upload")({ component: UploadPage });

type Draft = {
  key: string;
  title: string;
  durationSec: number;
  topic: string;
  hookStyle: string;
  cluster: string;
  originalName: string;
  fileSizeKb: number;
  progress: number;
};

function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("video");
    el.preload = "metadata";
    el.src = url;
    el.onloadedmetadata = () => {
      const d = Number.isFinite(el.duration) ? Math.round(el.duration) : 18;
      URL.revokeObjectURL(url);
      resolve(d || 18);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(18);
    };
  });
}

function UploadPage() {
  const { data, reload } = useWorkspace();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "reading" | "analyzing" | "done">("idle");
  const [accounts, setAccounts] = useState<string[]>([]);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewAssign>>["slots"] | null>(null);
  const [createdIds, setCreatedIds] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);

  const todayCount = data?.videos.length ?? 0;

  async function addFiles(files: FileList | File[]) {
    const list = [...files].filter((f) => f.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(f.name));
    if (!list.length) {
      toast.error("Нужны видеофайлы (mp4 / mov / webm)");
      return;
    }
    setPhase("reading");
    const next: Draft[] = [];
    for (const file of list.slice(0, 40)) {
      const durationSec = await readDuration(file);
      const base = file.name.replace(/\.[^.]+$/, "");
      next.push({
        key: `${file.name}-${file.size}-${file.lastModified}`,
        title: base,
        durationSec,
        topic: "Hook craft",
        hookStyle: "Question",
        cluster: "A",
        originalName: file.name,
        fileSizeKb: Math.round(file.size / 1024),
        progress: 100,
      });
    }
    setDrafts((d) => [...d, ...next]);
    setPhase("idle");
    toast.message(`Готово к анализу: ${next.length} файл(ов)`);
  }

  async function analyze() {
    if (!drafts.length) return;
    setBusy(true);
    setPhase("analyzing");
    try {
      const res = await ingestVideos({
        data: {
          items: drafts.map((d) => ({
            title: d.title,
            durationSec: d.durationSec,
            topic: d.topic,
            hookStyle: d.hookStyle,
            cluster: d.cluster,
            originalName: d.originalName,
            fileSizeKb: d.fileSizeKb,
          })),
        },
      });
      setCreatedIds(res.ids);
      setPhase("done");
      toast.success(`AI-анализ записан: ${res.ids.length} роликов. Оригинал в Postgres не кладётся.`);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
      setPhase("idle");
    } finally {
      setBusy(false);
    }
  }

  async function makePreview() {
    const ids = createdIds.length ? createdIds : (data?.videos.slice(0, drafts.length).map((v) => v.id) ?? []);
    if (!ids.length || !accounts.length) {
      toast.message("Выберите аккаунты");
      return;
    }
    const res = await previewAssign({ data: { videoIds: ids, accountIds: accounts } });
    setPreview(res.slots);
  }

  async function confirmSchedule() {
    const ids = createdIds;
    if (!ids.length || !accounts.length) return;
    const res = await massAssign({ data: { videoIds: ids, accountIds: accounts } });
    toast.success(`Создано независимых задач: ${res.created}`);
    setPreview(null);
    setDrafts([]);
    setCreatedIds([]);
    await reload();
  }

  const grouped = useMemo(() => {
    const map = new Map<string, NonNullable<typeof preview>>();
    for (const s of preview ?? []) {
      const arr = map.get(s.handle) ?? [];
      arr.push(s);
      map.set(s.handle, arr);
    }
    return [...map.entries()];
  }, [preview]);

  if (!data) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Ingest"
        title="Загрузка видео"
        actions={
          <Badge tone={todayCount >= 4 ? "ok" : "warn"}>
            В библиотеке {todayCount} · цель ≥ 4 / день
          </Badge>
        }
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={`panel grid min-h-44 place-items-center border-dashed p-6 text-center ${drag ? "border-cyan/50 bg-cyan/5" : ""}`}
      >
        <div>
          <p className="font-display text-lg font-semibold">Перетащите 4+ ролика сюда</p>
          <p className="mt-1 text-sm text-fg-muted">
            AI снимет длительность, посчитает hook score и предложит время публикации отдельно для каждого аккаунта.
          </p>
          <label className="mt-4 inline-flex">
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) void addFiles(e.target.files);
              }}
            />
            <span className="inline-flex h-10 cursor-pointer items-center rounded-[var(--radius-sm)] bg-cyan px-4 text-sm font-medium text-accent-fg">
              Выбрать файлы
            </span>
          </label>
        </div>
      </div>

      {phase === "analyzing" ? (
        <div className="panel overflow-hidden p-5">
          <p className="text-sm text-violet">AI ENGINE · сканирование роликов…</p>
          <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-bg">
            <div className="scan-bar absolute inset-y-0 w-1/3" />
          </div>
          <ul className="mt-3 space-y-1 text-xs text-fg-muted">
            <li>Анализ hook 0–3 сек</li>
            <li>Тема, тон, CTA</li>
            <li>Сравнение с историей аккаунта после назначения</li>
          </ul>
        </div>
      ) : null}

      {drafts.length ? (
        <div className="space-y-3">
          {drafts.map((d, i) => (
            <article key={d.key} className="panel grid gap-3 p-4 md:grid-cols-[1.2fr_1fr_1fr_80px]">
              <label className="text-xs text-fg-muted">
                Название
                <Input className="mt-1" value={d.title} onChange={(e) => {
                  const copy = [...drafts];
                  copy[i] = { ...d, title: e.target.value };
                  setDrafts(copy);
                }} />
              </label>
              <label className="text-xs text-fg-muted">
                Тема
                <Input className="mt-1" value={d.topic} onChange={(e) => {
                  const copy = [...drafts];
                  copy[i] = { ...d, topic: e.target.value };
                  setDrafts(copy);
                }} />
              </label>
              <label className="text-xs text-fg-muted">
                Hook
                <select
                  className="mt-1 flex h-10 w-full rounded-[var(--radius-sm)] border border-line bg-bg px-3 text-sm"
                  value={d.hookStyle}
                  onChange={(e) => {
                    const copy = [...drafts];
                    copy[i] = { ...d, hookStyle: e.target.value };
                    setDrafts(copy);
                  }}
                >
                  {HOOK_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {HOOK_RU[h]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="text-xs text-fg-muted">
                <p>Длина</p>
                <p className="mt-2 font-mono text-sm text-fg">{d.durationSec}s</p>
                <p className="text-[11px] text-fg-subtle">{d.fileSizeKb} КБ</p>
              </div>
            </article>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void analyze()}>
              AI-анализ {drafts.length} роликов
            </Button>
            <Button variant="ghost" onClick={() => setDrafts([])}>
              Очистить
            </Button>
          </div>
        </div>
      ) : null}

      {createdIds.length ? (
        <section className="panel space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold">Назначить на аккаунты</h2>
          <p className="text-sm text-fg-muted">
            Каждый аккаунт получает своё время: лучшие часы из AI-профиля и собственный интервал (4ч / 5ч / 6ч).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAccounts(data.accounts.map((a) => a.id))}>
              Все аккаунты
            </Button>
            {data.accounts.map((a) => {
              const prof = data.profiles.find((p) => p.accountId === a.id);
              const on = accounts.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAccounts(on ? accounts.filter((x) => x !== a.id) : [...accounts, a.id])}
                  className={`h-9 rounded-full border px-3 text-xs ${on ? "border-cyan text-cyan" : "border-line text-fg-muted"}`}
                >
                  @{a.handle}
                  {prof?.bestHours[0] != null ? ` · ${hourLabel(prof.bestHours[0])}` : ""}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void makePreview()}>
              Предпросмотр слотов
            </Button>
            <Button onClick={() => void confirmSchedule()} disabled={!accounts.length}>
              Подтвердить расписание
            </Button>
          </div>
          {grouped.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {grouped.map(([handle, slots]) => (
                <div key={handle} className="rounded-[var(--radius-md)] bg-bg p-3">
                  <p className="font-display text-sm font-semibold">@{handle}</p>
                  <ul className="mt-2 space-y-1 text-xs text-fg-muted">
                    {slots.map((s) => (
                      <li key={s.videoId + s.scheduledAt}>
                        {hourLabel(s.hour)} · {s.title} · conf {s.confidence}%
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <p className="max-w-2xl text-xs text-fg-subtle">
        Файлы в этом превью обрабатываются локально: длительность и имя. Сам бинарник в Postgres не пишется —
        на VPS worker + S3 хранит original и processed копию. Публикация идёт только через официальный Meta Graph API.
      </p>
    </div>
  );
}
