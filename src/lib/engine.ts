import { clamp, mean, median } from "./utils";
import type {
  AiProfile,
  DataSource,
  FunnelTotals,
  ScoredRow,
  VideoAnalytic,
} from "./types";

const WEIGHTS = {
  views: 0.26,
  reach: 0.14,
  profile: 0.24,
  link: 0.16,
  shares: 0.08,
  saves: 0.07,
  retention: 0.05,
};

export function rate(num: number | null | undefined, den: number | null | undefined): number | null {
  if (num == null || den == null || den <= 0) return null;
  return num / den;
}

export function performanceScore(row: {
  views: number | null;
  reach: number | null;
  profileVisits: number | null;
  linkClicks: number | null;
  shares?: number | null;
  saves?: number | null;
  retention?: number | null;
}, baseline: { medianViews: number; medianReach: number }): number | null {
  if (row.views == null) return null;
  const viewsIdx = clamp(row.views / Math.max(baseline.medianViews, 1) / 3, 0, 1);
  const reachIdx =
    row.reach == null ? viewsIdx : clamp(row.reach / Math.max(baseline.medianReach, 1) / 3, 0, 1);
  const pvr = rate(row.profileVisits, row.reach ?? row.views);
  const lcr = rate(row.linkClicks, row.profileVisits);
  const profileIdx = pvr == null ? 0.4 : clamp(pvr / 0.08);
  const linkIdx = lcr == null ? 0.35 : clamp(lcr / 0.25);
  const sharesIdx = row.shares == null ? 0.4 : clamp((row.shares / Math.max(row.views, 1)) / 0.02);
  const savesIdx = row.saves == null ? 0.4 : clamp((row.saves / Math.max(row.views, 1)) / 0.03);
  const retIdx = row.retention == null ? 0.45 : clamp(row.retention);
  const raw =
    WEIGHTS.views * viewsIdx +
    WEIGHTS.reach * reachIdx +
    WEIGHTS.profile * profileIdx +
    WEIGHTS.link * linkIdx +
    WEIGHTS.shares * sharesIdx +
    WEIGHTS.saves * savesIdx +
    WEIGHTS.retention * retIdx;
  return Math.round(clamp(raw) * 100);
}

export function outlierFlag(
  views: number | null,
  medianViews: number,
  sample: number,
): ScoredRow["outlier"] {
  if (views == null || sample < 4 || medianViews <= 0) return "insufficient";
  if (views >= medianViews * 6) return "viral";
  if (views <= medianViews * 0.28) return "under";
  return "normal";
}

export function confidenceFromSample(n: number): number {
  if (n <= 0) return 18;
  if (n < 5) return 22 + n * 6;
  if (n < 20) return 52 + Math.round((n - 5) * 1.8);
  return Math.min(92, 80 + Math.round(Math.log2(n - 19 + 2) * 4));
}

export function funnelFrom(rows: VideoAnalytic[]): FunnelTotals {
  if (!rows.length) {
    return { views: null, reach: null, profileVisits: null, linkClicks: null, source: "none" };
  }
  const sum = (key: keyof VideoAnalytic) => {
    const vals = rows.map((r) => r[key]).filter((v): v is number => typeof v === "number");
    if (!vals.length) return null;
    if (vals.length !== rows.length) return null;
    return vals.reduce((a, b) => a + b, 0);
  };
  const sources = new Set(rows.map((r) => r.source));
  const source: FunnelTotals["source"] =
    sources.size === 1 ? ([...sources][0] as DataSource) : "mixed";
  return {
    views: sum("views"),
    reach: sum("reach"),
    profileVisits: sum("profileVisits"),
    linkClicks: sum("linkClicks"),
    source,
  };
}

export function diagnoseFunnel(f: FunnelTotals): { headline: string; detail: string; action: string } {
  if (f.views == null) {
    return {
      headline: "Нет официальных метрик",
      detail: "Пока нет данных источника. Подключите Meta Graph API или используйте демо-набор как учебный контур.",
      action: "Не делать выводов о конверсии.",
    };
  }
  const discover = f.views;
  const reachShare = rate(f.reach, f.views) ?? 0;
  const pvr = rate(f.profileVisits, f.reach ?? f.views) ?? 0;
  const lcr = rate(f.linkClicks, f.profileVisits) ?? 0;
  if (pvr < 0.04) {
    return {
      headline: "Потери на входе в профиль",
      detail: `Discovery сильный (${Math.round(discover).toLocaleString("ru-RU")} views), но profile visit rate ${((pvr) * 100).toFixed(1)}% ниже рабочего порога 5–8%.`,
      action: "Усилить CTA на профиль и обещание в bio. Не трогать хештеги, пока не закроется этот разрыв.",
    };
  }
  if (lcr < 0.12 && f.linkClicks != null) {
    return {
      headline: "Профиль открывают, ссылку почти нет",
      detail: `Profile visits есть, link conversion ${((lcr) * 100).toFixed(1)}% слабая.`,
      action: "Тест CTA «полный вариант в профиле» vs конкретный оффер. Не менять тему ролика в том же эксперименте.",
    };
  }
  if (reachShare < 0.55) {
    return {
      headline: "Узкий reach относительно views",
      detail: "Повторы просмотров высокие, расширение аудитории слабое.",
      action: "Ротация topic cluster и свежий hook в первые 2 секунды.",
    };
  }
  return {
    headline: "Воронка сбалансирована",
    detail: "Discovery, profile visits и link clicks двигаются согласованно относительно базы аккаунта.",
    action: "Удерживать рабочий паттерн, тестировать одну переменную за раз.",
  };
}

type Hist = {
  accountId: string;
  videoId: string;
  hour: number;
  weekday: string;
  topic: string;
  hook: string;
  duration: number;
  captionLen: number;
  cta: string;
  cluster: string;
  views: number;
  reach: number;
  profileVisits: number;
  linkClicks: number;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function buildProfile(
  accountId: string,
  hist: Hist[],
): AiProfile {
  const n = hist.length;
  const conf = confidenceFromSample(n);
  if (!n) {
    return {
      accountId,
      bestHours: [],
      bestDays: [],
      bestLengthMin: null,
      bestLengthMax: null,
      bestTopics: [],
      bestHooks: [],
      bestCta: "",
      bestHashtagCluster: "",
      bestCaptionStyle: "",
      profileVisitRate: null,
      linkClickRate: null,
      confidence: conf,
      sampleSize: 0,
      doMore: ["Controlled experiments", "Короткий hook 0–2 сек"],
      doLess: ["Выводы на 1 ролике"],
      notes: "Cold start: недостаточно своей статистики. Общие паттерны действуют только до накопления данных аккаунта.",
    };
  }

  const byHour = new Map<number, number[]>();
  const byDay = new Map<string, number[]>();
  const byTopic = new Map<string, number[]>();
  const byHook = new Map<string, number[]>();
  const byCta = new Map<string, number[]>();
  const byCluster = new Map<string, number[]>();
  const pvr: number[] = [];
  const lcr: number[] = [];
  const durs: { d: number; v: number }[] = [];
  const capLens: { l: number; v: number }[] = [];

  for (const h of hist) {
    const score = h.views + h.profileVisits * 12 + h.linkClicks * 28;
    push(byHour, h.hour, score);
    push(byDay, h.weekday, score);
    push(byTopic, h.topic, score);
    push(byHook, h.hook, score);
    push(byCta, h.cta, score);
    push(byCluster, h.cluster, score);
    const pr = rate(h.profileVisits, h.reach);
    const lr = rate(h.linkClicks, h.profileVisits);
    if (pr != null) pvr.push(pr);
    if (lr != null) lcr.push(lr);
    durs.push({ d: h.duration, v: score });
    capLens.push({ l: h.captionLen, v: score });
  }

  const bestHours = topKeys(byHour, 3).map(Number);
  const bestDays = topKeys(byDay, 3);
  const bestTopics = topKeys(byTopic, 3);
  const bestHooks = topKeys(byHook, 3);
  const bestCta = topKeys(byCta, 1)[0] ?? "";
  const bestCluster = topKeys(byCluster, 1)[0] ?? "";
  const durSorted = [...durs].sort((a, b) => b.v - a.v).slice(0, Math.max(3, Math.floor(n / 3)));
  const lengths = durSorted.map((x) => x.d);
  const shortWins = mean(capLens.filter((c) => c.l < 90).map((c) => c.v));
  const longWins = mean(capLens.filter((c) => c.l >= 90).map((c) => c.v));

  const worstTopics = bottomKeys(byTopic, 2);
  const worstHooks = bottomKeys(byHook, 2);

  return {
    accountId,
    bestHours,
    bestDays,
    bestLengthMin: lengths.length ? Math.min(...lengths) : null,
    bestLengthMax: lengths.length ? Math.max(...lengths) : null,
    bestTopics,
    bestHooks,
    bestCta,
    bestHashtagCluster: bestCluster,
    bestCaptionStyle: shortWins >= longWins ? "short" : "long",
    profileVisitRate: pvr.length ? mean(pvr) : null,
    linkClickRate: lcr.length ? mean(lcr) : null,
    confidence: conf,
    sampleSize: n,
    doMore: [
      bestHooks[0] ? `Hook: ${bestHooks[0]}` : "Собрать ещё наблюдения",
      lengths.length ? `Длина ${Math.min(...lengths)}–${Math.max(...lengths)} сек` : "Тест длины",
      bestHours[0] != null ? `Слоты около ${String(bestHours[0]).padStart(2, "0")}:00` : "Тест времени",
      bestCta ? `CTA: ${bestCta}` : "Тест CTA на профиль",
    ].filter(Boolean),
    doLess: [
      ...worstHooks.map((h) => `Hook «${h}»`),
      ...worstTopics.map((t) => `Тема «${t}»`),
      shortWins >= longWins ? "Длинные общие captions" : "Слишком сухие captions",
    ],
    notes:
      n < 8
        ? "Малая выборка: корреляции отмечены, причинность не утверждается."
        : "Профиль пересчитан по собственной истории аккаунта. Account data overrides generic assumptions.",
  };
}

function push(map: Map<string | number, number[]>, key: string | number, v: number) {
  const arr = map.get(key) ?? [];
  arr.push(v);
  map.set(key, arr);
}

function topKeys(map: Map<string | number, number[]>, k: number): string[] {
  return [...map.entries()]
    .map(([key, vals]) => ({ key: String(key), score: mean(vals) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.key);
}

function bottomKeys(map: Map<string | number, number[]>, k: number): string[] {
  return [...map.entries()]
    .map(([key, vals]) => ({ key: String(key), score: mean(vals) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, k)
    .map((x) => x.key);
}

export function predictFor(args: {
  sample: { views: number; profileVisits: number; linkClicks: number }[];
  hourBoost: number;
}): {
  viewsLo: number;
  viewsHi: number;
  profileLo: number;
  profileHi: number;
  clicksLo: number;
  clicksHi: number;
  confidence: number;
} {
  const { sample, hourBoost } = args;
  const n = sample.length;
  const conf = confidenceFromSample(n);
  if (!n) {
    return { viewsLo: 0, viewsHi: 0, profileLo: 0, profileHi: 0, clicksLo: 0, clicksHi: 0, confidence: conf };
  }
  const views = sample.map((s) => s.views);
  const pv = sample.map((s) => s.profileVisits);
  const lc = sample.map((s) => s.linkClicks);
  const vMed = median(views) * hourBoost;
  const spread = Math.max(0.45, 1.1 - n / 40);
  return {
    viewsLo: Math.round(vMed * (1 - spread)),
    viewsHi: Math.round(vMed * (1 + spread * 1.35)),
    profileLo: Math.round(median(pv) * hourBoost * (1 - spread)),
    profileHi: Math.round(median(pv) * hourBoost * (1 + spread)),
    clicksLo: Math.round(median(lc) * hourBoost * (1 - spread)),
    clicksHi: Math.round(median(lc) * hourBoost * (1 + spread)),
    confidence: conf,
  };
}

export { DAYS };

export function weekdayFromIso(iso: string): string {
  return DAYS[new Date(iso).getUTCDay()] ?? "Monday";
}

export function hourFromIso(iso: string): number {
  return new Date(iso).getUTCHours();
}

export function factorBars(row: ScoredRow, profile: AiProfile | undefined, hookScore: number | null) {
  const views = row.views ?? 0;
  const viral = row.outlier === "viral";
  const under = row.outlier === "under";
  const hook = hookScore ?? 50;
  const topicHit = profile?.bestTopics.some((t) => row.title.toLowerCase().includes(t.toLowerCase())) ? 1 : 0.55;
  return [
    { key: "Hook", level: clamp(hook / 100) },
    { key: "Topic", level: topicHit },
    { key: "Timing", level: viral ? 0.85 : under ? 0.35 : 0.6 },
    { key: "Length", level: viral ? 0.8 : under ? 0.4 : 0.65 },
    { key: "Caption", level: under ? 0.4 : 0.58 },
    { key: "Hashtags", level: 0.5 },
    { key: "CTA", level: clamp((row.profileRate ?? 0.04) / 0.08) },
  ];
}
