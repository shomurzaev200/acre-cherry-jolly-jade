import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Skeleton } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCompact, formatPct, hourLabel } from "@/lib/format";
import { STATUS_RU, daysRu, modeRu } from "@/lib/labels";
import { addAccount, connectMetaAccount, deleteAccount, setAccountStatus, startMetaConnect, tickScheduler } from "@/lib/server/workspace";
import { useWorkspace } from "@/lib/use-workspace";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/accounts")({ component: AccountsPage });

function AccountsPage() {
  const { data, reload } = useWorkspace();
  const [handle, setHandle] = useState("");
  const [niche, setNiche] = useState("casino slot");
  const [interval, setInterval] = useState("4");
  const [metaFor, setMetaFor] = useState<string | null>(null);
  const [igId, setIgId] = useState("");
  const [token, setToken] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const connected = q.get("connected");
    const metaError = q.get("meta_error");
    if (connected) toast.success(`Instagram подключён: ${connected}`);
    if (metaError) toast.error(metaError);
  }, []);
  if (!data) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-6">
      <PageHeader kicker="Multi-account" title="Аккаунты" />
      <p className="panel p-4 text-sm text-fg-muted">
        Залил видео в «Загрузка» → назначил аккаунт → слот по AI-часам. Чтобы ролик ушёл в Instagram, на карточке
        жми <strong>Подключить Instagram</strong> (окно Facebook «Разрешить»). Пароль не вводится.
      </p>
      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={async () => {
            const r = await tickScheduler();
            toast.message(`Очередь: обработано ${r.processed}, опубликовано ${"published" in r ? r.published : 0}`);
            await reload();
          }}
        >
          Прогнать очередь сейчас
        </Button>
      </div>
      <form
        className="panel grid gap-3 p-4 md:grid-cols-[1fr_1fr_120px_auto]"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await addAccount({ data: { handle, niche, intervalHours: Number(interval) || 6 } });
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          setHandle("");
          toast.success("Карточка создана. Подключи Meta-токен, иначе посты останутся в очереди.");
          await reload();
        }}
      >
        <Input placeholder="@handle" value={handle} onChange={(e) => setHandle(e.target.value)} required />
        <Input placeholder="Ниша (casino slot)" value={niche} onChange={(e) => setNiche(e.target.value)} />
        <Input
          type="number"
          min={1}
          max={24}
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
          aria-label="Интервал, часов"
        />
        <Button type="submit">Добавить</Button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.accounts.map((a) => {
          const prof = data.profiles.find((p) => p.accountId === a.id);
          const rows = data.scored.filter((s) => s.accountId === a.id);
          const views = rows.reduce((n, r) => n + (r.views ?? 0), 0);
          const pv = rows.reduce((n, r) => n + (r.profileVisits ?? 0), 0);
          const lc = rows.reduce((n, r) => n + (r.linkClicks ?? 0), 0);
          const net = data.networks.find((n) => n.id === a.networkProfileId);
          const next = data.tasks
            .filter((t) => t.accountId === a.id && (t.status === "queued" || t.status === "pending_approval"))
            .sort((x, y) => +new Date(x.scheduledAt) - +new Date(y.scheduledAt))[0];
          const isDemo = ["city.notes", "daily.craft", "north.atelier"].includes(a.handle);
          return (
            <article key={a.id} className="panel flex flex-col p-5 transition-[border,box-shadow] hover:border-cyan/30">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link to="/accounts/$id" params={{ id: a.id }} className="font-display text-lg font-semibold hover:text-cyan">
                    @{a.handle}
                  </Link>
                  <p className="text-xs text-fg-muted">{a.niche}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge tone={a.status === "ACTIVE" ? "ok" : a.status === "PAUSED" ? "warn" : "danger"}>
                    {STATUS_RU[a.status]}
                  </Badge>
                  <Badge tone={a.metaConnected ? "ok" : "warn"}>{a.metaConnected ? "Meta" : "нет API"}</Badge>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Stat k="Подписчики" v={formatCompact(a.followers || null)} />
                <Stat k="Просмотры" v={formatCompact(views)} />
                <Stat k="В профиль" v={formatCompact(pv)} />
                <Stat k="По ссылке" v={formatCompact(lc)} />
                <Stat k="PVR" v={formatPct(prof?.profileVisitRate)} />
                <Stat k="Интервал" v={`каждые ${a.intervalHours}ч`} />
              </dl>
              <p className="mt-3 text-xs text-violet">
                AI слот: {prof?.bestHours.map(hourLabel).join(" · ") || "мало данных"} · {daysRu(prof?.bestDays ?? []) || "—"}
              </p>
              <p className="mt-1 text-xs text-fg-subtle">
                {modeRu(a.mode)} · сеть {net?.name ?? "direct"} · след.{" "}
                {next ? new Date(next.scheduledAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "—"}
                {a.metaTokenHint ? ` · токен ${a.metaTokenHint}` : ""}
              </p>
              {isDemo ? <p className="mt-2 text-[11px] text-warn">Демо-карточка, не живой Instagram</p> : null}

              {metaFor === a.id ? (
                <form
                  className="mt-3 space-y-2 rounded-[var(--radius-md)] border border-line p-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const r = await connectMetaAccount({ data: { id: a.id, igBusinessId: igId, accessToken: token } });
                    if (!r.ok) toast.error(r.error);
                    else {
                      toast.success("Meta токен сохранён на сервере");
                      setMetaFor(null);
                      setToken("");
                      setIgId("");
                      await reload();
                    }
                  }}
                >
                  <Input placeholder="IG Business Account ID" value={igId} onChange={(e) => setIgId(e.target.value)} required />
                  <Input
                    type="password"
                    placeholder="Long-lived Graph token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">
                      Сохранить токен
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setMetaFor(null)}>
                      Отмена
                    </Button>
                  </div>
                </form>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/accounts/$id"
                  params={{ id: a.id }}
                  className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-line px-3 text-xs hover:border-cyan/40"
                >
                  Открыть
                </Link>
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
                  {a.status === "PAUSED" ? "Запустить" : "Пауза"}
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    const r = await startMetaConnect({ data: { accountId: a.id } });
                    if (!r.ok) toast.error(r.error);
                    else window.location.assign(r.url);
                  }}
                >
                  Подключить Instagram
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setMetaFor(metaFor === a.id ? null : a.id)}>
                  Вручную
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    if (!window.confirm(`Удалить @${a.handle} и его очередь?`)) return;
                    const r = await deleteAccount({ data: { id: a.id } });
                    if (!r.ok) toast.error(r.error);
                    else toast.success("Аккаунт удалён");
                    await reload();
                  }}
                >
                  Удалить
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-fg-subtle">{k}</dt>
      <dd className="font-mono tabular">{v}</dd>
    </div>
  );
}
