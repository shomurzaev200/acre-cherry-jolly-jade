import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/lib/use-workspace";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const { data } = useWorkspace();
  if (!data) return <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-bg-subtle" />;

  return (
    <div className="space-y-6">
      <PageHeader kicker="Control" title="Настройки" />
      <section className="panel space-y-3 p-5 text-sm">
        <h2 className="font-display font-semibold">Роли</h2>
        <p>Текущая роль: <Badge>{data.role}</Badge> · OWNER / ADMIN / EDITOR / VIEWER</p>
        <p className="text-fg-muted">AI никогда не лишает администратора контроля: caption, hashtags, CTA, time, account, network можно переопределить на Approve.</p>
      </section>
      <section className="panel space-y-3 p-5 text-sm">
        <h2 className="font-display font-semibold">Meta Graph API</h2>
        <p className="text-fg-muted">
          Подключение Instagram Business / Creator идёт через официальный OAuth Meta. Без валидного
          токена публикация остаётся в статусе awaiting_official_api, метрики — N/A. Fake Instagram
          API в продукт не встроен.
        </p>
        <p className="text-xs text-fg-subtle">
          Нужны META_CLIENT_ID и META_CLIENT_SECRET на VPS. Токены хранятся только на сервере.
        </p>
      </section>
      <section className="panel space-y-3 p-5 text-sm">
        <h2 className="font-display font-semibold">Уведомления</h2>
        <ul className="space-y-2">
          {data.notifications.map((n) => (
            <li key={n.id}>
              <p className="font-medium">{n.title}</p>
              <p className="text-fg-muted">{n.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
