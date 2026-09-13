import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { pauseAll } from "@/lib/server/workspace";
import { useWorkspace } from "@/lib/use-workspace";

const ROUTES = [
  { to: "/", label: "Обзор", hint: "dashboard" },
  { to: "/accounts", label: "Аккаунты", hint: "accounts" },
  { to: "/content", label: "Контент", hint: "library videos" },
  { to: "/upload", label: "Загрузить видео", hint: "upload bulk" },
  { to: "/calendar", label: "Календарь", hint: "schedule" },
  { to: "/queue", label: "Очередь", hint: "queue" },
  { to: "/approvals", label: "Подтверждения", hint: "approve" },
  { to: "/intelligence", label: "AI Intelligence", hint: "insights" },
  { to: "/experiments", label: "Эксперименты", hint: "ab test" },
  { to: "/analytics", label: "Аналитика", hint: "funnel" },
  { to: "/reports", label: "Отчёты", hint: "daily weekly" },
  { to: "/network", label: "Сеть и прокси", hint: "vpn proxy" },
  { to: "/health", label: "Ошибки и health", hint: "errors" },
  { to: "/settings", label: "Настройки", hint: "settings" },
] as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data, reload } = useWorkspace();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pulse:open-command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pulse:open-command", onOpen);
    };
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-black/60" aria-label="Закрыть" onClick={() => setOpen(false)} />
      <div className="relative mx-auto mt-[12vh] w-[min(560px,92vw)]">
        <Command
          label="Командный центр"
          className="panel overflow-hidden border-cyan/20 shadow-[0_0_48px_-12px_rgb(0_212_224_/_0.35)]"
        >
          <Command.Input
            autoFocus
            placeholder="Поиск аккаунта, видео, раздела…"
            className="h-12 w-full border-b border-line bg-transparent px-4 text-sm text-fg outline-none placeholder:text-fg-subtle"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-sm text-fg-muted">Ничего не найдено</Command.Empty>
            <Command.Group heading="Навигация" className="px-1 py-1 text-[11px] uppercase tracking-wider text-fg-subtle">
              {ROUTES.map((r) => (
                <Command.Item
                  key={r.to}
                  value={`${r.label} ${r.hint}`}
                  onSelect={() => {
                    void navigate({ to: r.to });
                    setOpen(false);
                  }}
                  className="flex h-9 cursor-pointer items-center rounded-[var(--radius-sm)] px-3 text-sm text-fg aria-selected:bg-bg-subtle"
                >
                  {r.label}
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Аккаунты" className="px-1 py-1 text-[11px] uppercase tracking-wider text-fg-subtle">
              {(data?.accounts ?? []).map((a) => (
                <Command.Item
                  key={a.id}
                  value={`@${a.handle} ${a.niche}`}
                  onSelect={() => {
                    void navigate({ to: "/accounts/$id", params: { id: a.id } });
                    setOpen(false);
                  }}
                  className="flex h-9 cursor-pointer items-center rounded-[var(--radius-sm)] px-3 text-sm text-fg aria-selected:bg-bg-subtle"
                >
                  @{a.handle}
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Система" className="px-1 py-1 text-[11px] uppercase tracking-wider text-fg-subtle">
              <Command.Item
                value="pause all пауза"
                onSelect={async () => {
                  await pauseAll({ data: true });
                  await reload();
                  setOpen(false);
                }}
                className="flex h-9 cursor-pointer items-center rounded-[var(--radius-sm)] px-3 text-sm text-fg aria-selected:bg-bg-subtle"
              >
                Пауза всех публикаций
              </Command.Item>
              <Command.Item
                value="resume all возобновить"
                onSelect={async () => {
                  await pauseAll({ data: false });
                  await reload();
                  setOpen(false);
                }}
                className="flex h-9 cursor-pointer items-center rounded-[var(--radius-sm)] px-3 text-sm text-fg aria-selected:bg-bg-subtle"
              >
                Возобновить все
              </Command.Item>
            </Command.Group>
          </Command.List>
          <p className="border-t border-line px-4 py-2 text-[11px] text-fg-subtle">Ctrl / ⌘ + K · Esc закрыть</p>
        </Command>
      </div>
    </div>
  );
}
