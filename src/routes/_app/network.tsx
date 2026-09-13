import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Skeleton } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NET_RU } from "@/lib/labels";
import { probeNetwork, setAccountNetwork, upsertNetwork } from "@/lib/server/workspace";
import { useWorkspace } from "@/lib/use-workspace";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/network")({ component: NetworkPage });

function NetworkPage() {
  const { data, reload } = useWorkspace();
  const [name, setName] = useState("");
  const [region, setRegion] = useState("Asia/Tashkent");
  const [kind, setKind] = useState("none");
  const [host, setHost] = useState("");

  if (!data) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-6">
      <PageHeader kicker="Routing" title="Сеть / VPN / прокси" />
      <div className="panel border-warn/30 p-4 text-sm text-fg-muted">
        Профили нужны для легитимной маршрутизации. Запрещено: обход блокировок, CAPTCHA, 2FA, украденные
        cookies/session, массовые бесплатные публичные proxy как «защита от банов». Бесплатный прокси — только
        опция, без гарантии стабильности.
      </div>

      <form
        className="panel grid gap-3 p-5 md:grid-cols-2 lg:grid-cols-5"
        onSubmit={async (e) => {
          e.preventDefault();
          await upsertNetwork({
            data: { name, region, proxyKind: kind, proxyHost: host },
          });
          setName("");
          setHost("");
          toast.success("Профиль сети добавлен");
          await reload();
        }}
      >
        <Input placeholder="Имя профиля" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input placeholder="Регион / TZ" value={region} onChange={(e) => setRegion(e.target.value)} />
        <select
          className="h-10 rounded-[var(--radius-sm)] border border-line bg-bg px-3 text-sm"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="none">Прямое соединение (бесплатно)</option>
          <option value="datacenter">Свой прокси / VPN</option>
          <option value="free">Бесплатный proxy pool</option>
        </select>
        <Input placeholder="host:port (необязательно)" value={host} onChange={(e) => setHost(e.target.value)} />
        <Button type="submit">Добавить</Button>
      </form>
      {kind === "free" ? (
        <p className="text-xs text-warn">Free proxy may be unstable or insecure. Не использовать в production как защиту от банов.</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {data.networks.map((n) => (
          <article key={n.id} className="panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold">{n.name}</h2>
              <Badge tone={n.status === "HEALTHY" ? "ok" : n.status === "WARNING" ? "warn" : "danger"}>
                {NET_RU[n.status]}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-fg-muted">{n.region}</p>
            <p className="mt-1 font-mono text-xs text-fg-subtle">
              {n.proxyKind === "none" ? "direct / без прокси" : n.proxyHost || n.proxyKind}
            </p>
            <p className="mt-3 text-sm">Latency {n.latencyMs ?? "N/A"} ms</p>
            {n.proxyKind === "free" ? (
              <p className="mt-2 text-xs text-warn">Free proxy may be unstable or insecure.</p>
            ) : null}
            {n.warning ? <p className="mt-2 text-xs text-fg-muted">{n.warning}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const r = await probeNetwork({ data: n.id });
                  if (r.ok) toast.message(`Проверка: ${r.status} · ${r.latencyMs} ms`);
                  await reload();
                }}
              >
                Проверить
              </Button>
            </div>
            <label className="mt-3 block text-xs text-fg-muted">
              Назначить аккаунту
              <select
                className="mt-1 h-9 w-full rounded-[var(--radius-sm)] border border-line bg-bg px-2 text-sm"
                defaultValue=""
                onChange={async (e) => {
                  const accountId = e.target.value;
                  if (!accountId) return;
                  await setAccountNetwork({ data: { accountId, networkId: n.id } });
                  toast.success("Профиль назначен");
                  await reload();
                }}
              >
                <option value="">— выбрать —</option>
                {data.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    @{a.handle} {a.networkProfileId === n.id ? "· текущий" : ""}
                  </option>
                ))}
              </select>
            </label>
          </article>
        ))}
      </div>
    </div>
  );
}
