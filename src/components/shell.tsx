import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  CircuitBoard,
  Clapperboard,
  FlaskConical,
  Globe,
  HeartPulse,
  LayoutDashboard,
  ListChecks,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { UserButton } from "@/lib/auth/gates";
import { healthCheck } from "@/lib/server/workspace";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./command-palette";
import { StatusDot } from "./status-dot";
import { Button } from "./ui/button";

const NAV = [
  { to: "/", label: "Обзор", icon: LayoutDashboard },
  { to: "/accounts", label: "Аккаунты", icon: Users },
  { to: "/content", label: "Контент", icon: Clapperboard },
  { to: "/upload", label: "Загрузка", icon: Upload },
  { to: "/calendar", label: "Календарь", icon: CalendarDays },
  { to: "/queue", label: "Очередь", icon: ListChecks },
  { to: "/approvals", label: "Approve", icon: ShieldCheck },
  { to: "/intelligence", label: "AI Intelligence", icon: Sparkles },
  { to: "/experiments", label: "Эксперименты", icon: FlaskConical },
  { to: "/analytics", label: "Аналитика", icon: CircuitBoard },
  { to: "/reports", label: "Отчёты", icon: Bell },
  { to: "/network", label: "Сеть / VPN", icon: Globe },
  { to: "/health", label: "Ошибки", icon: HeartPulse },
  { to: "/settings", label: "Настройки", icon: Settings },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [health, setHealth] = useState<{ api: string; database: string; ai: string } | null>(null);

  useEffect(() => {
    void healthCheck()
      .then((h) => setHealth({ api: h.api, database: h.database, ai: h.ai }))
      .catch(() => setHealth({ api: "error", database: "error", ai: "unavailable" }));
  }, []);

  const online = health?.api === "ok" && health.database === "ok";

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-cyan focus:px-3 focus:py-2 focus:text-accent-fg"
      >
        К содержимому
      </a>
      <div className="flex min-h-dvh">
        <aside className="rail-shadow sticky top-0 hidden h-dvh w-[228px] shrink-0 flex-col md:flex">
          <Brand />
          <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass-bar sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line px-4 md:px-6">
            <div className="flex items-center gap-2 md:hidden">
              <Button variant="ghost" size="icon" aria-label="Меню" onClick={() => setOpen(true)}>
                <Menu className="size-5" />
              </Button>
              <span className="font-display text-sm font-semibold tracking-wide">PULSE</span>
            </div>
            <p className="hidden text-xs text-fg-muted md:block">
              Органика · Views → Profile visits → Link clicks
            </p>
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("pulse:open-command"))}
                className="hidden h-9 items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-bg-subtle px-3 text-xs text-fg-muted md:flex"
              >
                <Search className="size-3.5" />
                Поиск
                <kbd className="font-mono text-[10px] text-fg-subtle">Ctrl K</kbd>
              </button>
              <StatusDot
                tone={online ? "ok" : "danger"}
                pulse={online}
                label={online ? "Система online" : "Система"}
              />
              <UserButton />
            </div>
          </header>
          <main id="main" className="flex-1 px-4 py-5 md:px-8 md:py-7">
            {children}
          </main>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button className="absolute inset-0 bg-black/60" aria-label="Закрыть" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-[82%] max-w-xs flex-col bg-bg-elevated">
            <div className="flex items-center justify-between pr-2">
              <Brand />
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Закрыть меню">
                <X className="size-5" />
              </Button>
            </div>
            <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
      <CommandPalette />
      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-4 py-5">
      <span className="grid size-8 place-items-center rounded-[10px] border border-cyan/30 bg-bg shadow-[0_0_16px_-6px_rgb(0_212_224)]">
        <svg viewBox="0 0 24 24" className="size-4 text-cyan" aria-hidden>
          <path d="M4 18 L10 10 L14 14 L20 6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="20" cy="6" r="1.6" fill="currentColor" />
        </svg>
      </span>
      <div>
        <p className="font-display text-sm font-semibold tracking-[0.18em]">PULSE</p>
        <p className="text-[10px] uppercase tracking-[0.16em] text-fg-subtle">AI Command Center</p>
      </div>
    </div>
  );
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-6">
      {NAV.map((item) => {
        const active =
          item.to === "/" ? pathname === "/" : pathname === item.to || pathname.startsWith(`${item.to}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex h-10 items-center gap-2.5 rounded-[var(--radius-sm)] px-3 text-sm transition-colors",
              active ? "nav-active" : "text-fg-muted hover:bg-bg-subtle hover:text-fg",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active ? "text-cyan" : "")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
