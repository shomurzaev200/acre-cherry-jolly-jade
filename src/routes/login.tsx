import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0] ?? "owner",
        });
        if (res.error) throw new Error(res.error.message);
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message);
      }
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-5 py-10 text-fg">
      <div className="w-full max-w-md">
        <p className="font-display text-xs font-semibold tracking-[0.28em] text-cyan">PULSE</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">AI Command Center</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Мультиаккаунтный контур: загрузка видео, AI-слоты, очередь и воронка Views → Profile → Link. Только
          официальный Meta Graph API.
        </p>

        <div className="panel mt-8 space-y-3 p-5">
          {authEnabled ? (
            <>
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                >
                  Продолжить с {p.label}
                </Button>
              ))}
              <div className="flex items-center gap-3 py-1 text-[11px] uppercase tracking-widest text-fg-subtle">
                <span className="h-px flex-1 bg-line" />
                email
                <span className="h-px flex-1 bg-line" />
              </div>
              <form className="space-y-2" onSubmit={onEmail}>
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="owner@studio.test"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  placeholder="Пароль, минимум 8 символов"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {error ? <p className="text-xs text-danger">{error}</p> : null}
                <Button type="submit" className="w-full" disabled={pending}>
                  {mode === "up" ? "Создать владельца" : "Войти"}
                </Button>
              </form>
              <button
                type="button"
                className="w-full text-center text-xs text-fg-muted hover:text-fg"
                onClick={() => setMode(mode === "up" ? "in" : "up")}
              >
                {mode === "up" ? "Уже есть доступ — войти" : "Первый запуск — создать владельца"}
              </button>
            </>
          ) : (
            <p className="text-sm text-fg-muted">Вход отключён.</p>
          )}
        </div>
      </div>
    </main>
  );
}
