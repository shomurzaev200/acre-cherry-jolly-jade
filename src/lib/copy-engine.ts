/** Caption / hashtag generation + Telegram alerts. Keys stay server-side. */

const CASINO_HASHTAGS =
  "#slots #casino #slotgames #onlinecasino #jackpot #казино #слоты #новыеигры #gambling #slotmachine #казино2026 #слоты2026";

export function localCasinoCopy(input: { title: string; niche: string; handle: string }) {
  const title = input.title.replace(/\.[^.]+$/, "");
  const caption = [
    `${title} — новый слот, который нельзя пропустить.`,
    `Бонуски, фриспины и атмосфера зала. Ниша: ${input.niche || "casino slot"}.`,
    `Сохрани, если ищешь игры 2026 🔥`,
    `Ссылка в профиле @${input.handle}`,
  ].join("\n");
  return { caption, hashtags: CASINO_HASHTAGS, cta: "Ссылка в профиле", provider: "local" as const };
}

export async function geminiCopy(opts: {
  apiKey: string;
  title: string;
  niche: string;
  handle: string;
  durationSec?: number;
}): Promise<{ caption: string; hashtags: string; cta: string; provider: "gemini" | "local" }> {
  const prompt = `Ты редактор Instagram Reels для ниши казино / слоты / новые игры 2026.
Напиши на русском:
1) caption 2–5 коротких строк, без обещания выигрыша, без «гарантия», без призыва к ставкам несовершеннолетним.
2) строку хештегов (12–18 штук, смесь RU+EN, включая нишу слоты/казино/новые игры 2026).
3) CTA одной строкой (профиль / ссылка в шапке).

Ролик: «${opts.title}», длительность ${opts.durationSec ?? 20}с, аккаунт @${opts.handle}, ниша ${opts.niche}.

Верни строго JSON: {"caption":"...","hashtags":"...","cta":"..."}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(opts.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
        }),
      },
    );
    if (!res.ok) return { ...localCasinoCopy(opts), provider: "local" };
    const body = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const jsonText = text.replace(/^```json\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(jsonText) as { caption?: string; hashtags?: string; cta?: string };
    if (!parsed.caption) return { ...localCasinoCopy(opts), provider: "local" };
    return {
      caption: parsed.caption,
      hashtags: parsed.hashtags || CASINO_HASHTAGS,
      cta: parsed.cta || "Ссылка в профиле",
      provider: "gemini",
    };
  } catch {
    return { ...localCasinoCopy(opts), provider: "local" };
  }
}

export async function sendTelegram(token: string, chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const body = (await res.json()) as { ok?: boolean; description?: string };
  if (!res.ok || !body.ok) return { ok: false as const, error: body.description || `HTTP ${res.status}` };
  return { ok: true as const };
}
