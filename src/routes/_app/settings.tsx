import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateCopy, saveIntegrations, testTelegram } from "@/lib/server/workspace";
import { useWorkspace } from "@/lib/use-workspace";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const { data, reload } = useWorkspace();
  const [bot, setBot] = useState("");
  const [chat, setChat] = useState("");
  const [gemini, setGemini] = useState("");
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState<{ caption: string; hashtags: string; cta: string; provider: string } | null>(
    null,
  );

  if (!data) return <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-bg-subtle" />;

  const integ = data.integrations;

  async function save() {
    setBusy(true);
    try {
      await saveIntegrations({
        data: {
          telegramBotToken: bot.trim() ? bot.trim() : "KEEP",
          telegramChatId: chat.trim() || integ.telegramChatId,
          geminiApiKey: gemini.trim() ? gemini.trim() : "KEEP",
        },
      });
      setBot("");
      setGemini("");
      toast.success("Ключи сохранены на сервере, в браузер не возвращаются");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не сохранилось — проверь миграции");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader kicker="Control" title="Настройки" />

      <section className="panel space-y-3 p-5 text-sm">
        <h2 className="font-display font-semibold">Почему нет пароля Instagram</h2>
        <p className="text-fg-muted">
          Instagram не отдаёт вход по логину/паролю сторонним панелям. Сбор пароля — нарушение ToS и риск бана.
          PULSE добавляет аккаунт как <strong>карточку очереди</strong>, а публикует только через официальный{" "}
          <strong>Meta Graph API</strong> (Business / Creator). Без токена задача = awaiting_official_api, метрики N/A.
        </p>
      </section>

      <section className="panel space-y-4 p-5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display font-semibold">Telegram-алерты</h2>
          <Badge tone={integ.telegramBotSet ? "ok" : "warn"}>
            {integ.telegramBotSet ? `бот ${integ.telegramBotHint}` : "не задан"}
          </Badge>
        </div>
        <p className="text-fg-muted">
          1) @BotFather → /newbot → скопируй токен. 2) Создай канал, добавь бота админом. 3) Chat ID:{" "}
          <code className="text-cyan">@имя_канала</code> или числовой id.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            type="password"
            placeholder={integ.telegramBotHint ? `токен ${integ.telegramBotHint}` : "123456:AAE... токен бота"}
            value={bot}
            onChange={(e) => setBot(e.target.value)}
            autoComplete="off"
          />
          <Input
            placeholder="@mychannel или -100..."
            value={chat || integ.telegramChatId}
            onChange={(e) => setChat(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => void save()}>
            Сохранить
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              const r = await testTelegram();
              if (r.ok) toast.success("Тест ушёл в Telegram");
              else toast.error(r.error);
            }}
          >
            Тест алерта
          </Button>
        </div>
      </section>

      <section className="panel space-y-4 p-5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display font-semibold">Google AI Studio — описания и хештеги</h2>
          <Badge tone={integ.geminiSet ? "ok" : "warn"}>{integ.geminiSet ? integ.geminiHint : "локальный шаблон"}</Badge>
        </div>
        <p className="text-fg-muted">
          Бесплатный ключ:{" "}
          <a className="text-cyan underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
            aistudio.google.com/apikey
          </a>
          . Ниша по умолчанию: казино / слоты / новые игры 2026. Ключ хранится только в Postgres на VPS.
        </p>
        <Input
          type="password"
          placeholder={integ.geminiHint ? `ключ ${integ.geminiHint}` : "AIza... ключ Gemini"}
          value={gemini}
          onChange={(e) => setGemini(e.target.value)}
          autoComplete="off"
        />
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => void save()}>
            Сохранить ключ
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              const r = await generateCopy({
                data: { title: "Sweet Bonanza 1000 — обзор слота", niche: "casino slot", handle: "zimorogame", durationSec: 18 },
              });
              setSample(r);
              toast.message(`Провайдер: ${r.provider}`);
            }}
          >
            Сгенерировать пример
          </Button>
        </div>
        {sample ? (
          <pre className="overflow-x-auto rounded-[var(--radius-md)] bg-bg-subtle p-3 text-xs whitespace-pre-wrap">
            {sample.caption}
            {"\n\n"}
            {sample.hashtags}
            {"\n\n"}
            CTA: {sample.cta}
          </pre>
        ) : null}
      </section>

      <section className="panel space-y-3 p-5 text-sm">
        <h2 className="font-display font-semibold">Meta Graph API</h2>
        <p className="text-fg-muted">
          На карточке аккаунта: Instagram Business/Creator ID + long-lived User token из{" "}
          <a className="text-cyan underline" href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer">
            Graph API Explorer
          </a>
          . Нужны права <code>instagram_content_publish</code>, <code>instagram_basic</code>,{" "}
          <code>pages_show_list</code>.
        </p>
      </section>
    </div>
  );
}
