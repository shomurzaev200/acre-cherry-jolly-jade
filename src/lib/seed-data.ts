import { mulberry32, nid } from "./utils";

export const DEMO_ACCOUNTS = [
  {
    id: "acc_north",
    handle: "north.atelier",
    displayName: "North Atelier",
    niche: "Fashion / quiet luxury",
    language: "ru",
    intervalHours: 4,
    followers: 48200,
    bio: "Тихая роскошь. Образы и разборы — ссылка ниже.",
    profileLink: "https://north.example/shop",
    bestHour: 19,
  },
  {
    id: "acc_craft",
    handle: "daily.craft",
    displayName: "Daily Craft",
    niche: "How-to / short tutorials",
    language: "ru",
    intervalHours: 5,
    followers: 12840,
    bio: "Делай руками. Полные гайды в профиле.",
    profileLink: "https://craft.example/guides",
    bestHour: 14,
  },
  {
    id: "acc_city",
    handle: "city.notes",
    displayName: "City Notes",
    niche: "Facts / urban stories",
    language: "ru",
    intervalHours: 6,
    followers: 89110,
    bio: "Город, которого нет на карте. Истории полностью — в профиле.",
    profileLink: "https://city.example/notes",
    bestHour: 21,
  },
] as const;

export const DEMO_NETWORKS = [
  {
    id: "net_tashkent",
    name: "Tashkent primary",
    region: "Asia/Tashkent",
    proxyHost: "",
    proxyKind: "none",
    status: "HEALTHY" as const,
    latencyMs: 18,
    warning: null as string | null,
  },
  {
    id: "net_eu",
    name: "EU routing",
    region: "eu-central",
    proxyHost: "egress.example.net:8443",
    proxyKind: "datacenter",
    status: "WARNING" as const,
    latencyMs: 240,
    warning: "Latency высокий. Не использовать бесплатные публичные proxy для обхода ограничений платформы.",
  },
  {
    id: "net_free",
    name: "Free provider (optional)",
    region: "public",
    proxyHost: "free.example:1080",
    proxyKind: "free",
    status: "DISABLED" as const,
    latencyMs: null as number | null,
    warning: "Free proxy may be unstable or insecure. Только легитимная маршрутизация, не обход блокировок.",
  },
];

export const DEMO_VIDEOS = [
  {
    id: "vid_01",
    title: "Почему все ошибаются в первом кадре",
    durationSec: 18,
    topic: "Hook craft",
    topicCluster: "A",
    hookStyle: "Question",
    seed: "1",
  },
  {
    id: "vid_02",
    title: "Три секунды тишины перед смыслом",
    durationSec: 27,
    topic: "Slow intro",
    topicCluster: "C",
    hookStyle: "Long intro",
    seed: "2",
  },
  {
    id: "vid_03",
    title: "Я не ожидал этот результат",
    durationSec: 16,
    topic: "Unexpected fact",
    topicCluster: "B",
    hookStyle: "Unexpected fact",
    seed: "3",
  },
  {
    id: "vid_04",
    title: "Полный вариант уже в профиле",
    durationSec: 21,
    topic: "Profile CTA",
    topicCluster: "A",
    hookStyle: "Problem → Solution",
    seed: "4",
  },
  {
    id: "vid_05",
    title: "Как собрать кадр за 20 секунд",
    durationSec: 20,
    topic: "Tutorial",
    topicCluster: "D",
    hookStyle: "Problem → Solution",
    seed: "5",
  },
  {
    id: "vid_06",
    title: "Этот район исчез с карт",
    durationSec: 15,
    topic: "Urban myth",
    topicCluster: "B",
    hookStyle: "Unexpected fact",
    seed: "6",
  },
  {
    id: "vid_07",
    title: "Один и тот же хук снова",
    durationSec: 19,
    topic: "Hook craft",
    topicCluster: "A",
    hookStyle: "Question",
    seed: "7",
  },
  {
    id: "vid_08",
    title: "Короткий оффер без обещания",
    durationSec: 12,
    topic: "Weak CTA",
    topicCluster: "C",
    hookStyle: "Generic",
    seed: "8",
  },
];

const CTA = {
  profile: "Полный вариант уже в профиле.",
  link: "Смотри ссылку в описании профиля.",
  follow: "Подпишись, если хочешь разборы.",
  save: "Сохрани, чтобы вернуться к схеме.",
};

const CLUSTERS: Record<string, string> = {
  A: "#quietluxury #atelier #lookbook #visualstory",
  B: "#urbanfacts #citynotes #hiddenplaces #storytime",
  C: "#editingtips #firstframe #retention #shortform",
  D: "#howto #dailycraft #tutorial #makeit",
};

export function analysisFor(video: (typeof DEMO_VIDEOS)[number]) {
  const hookMap: Record<string, number> = {
    Question: 91,
    "Unexpected fact": 88,
    "Problem → Solution": 84,
    "Long intro": 38,
    Generic: 41,
  };
  const hookScore = hookMap[video.hookStyle] ?? 60;
  const conversion = video.id === "vid_04" ? 89 : video.id === "vid_08" ? 44 : 72 + (hookScore - 70);
  const reasons =
    video.hookStyle === "Long intro"
      ? ["− длинное интро", "− нет обещания в 0–2 сек", "− низкая плотность"]
      : video.hookStyle === "Question"
        ? ["+ вопрос в первые 2 сек", "+ визуальная смена", "+ обещание результата"]
        : video.hookStyle === "Unexpected fact"
          ? ["+ неожиданный факт", "+ высокая плотность", "+ смена кадра"]
          : ["+ problem → solution", "+ CTA на профиль", "+ ясная структура"];
  const total = Math.round(
    hookScore * 0.28 +
      (video.durationSec >= 14 && video.durationSec <= 23 ? 86 : 62) * 0.2 +
      conversion * 0.22 +
      80 * 0.15 +
      78 * 0.15,
  );
  return {
    videoId: video.id,
    analysisHash: `hash_${video.id}_v1`,
    topic: video.topic,
    category: video.topicCluster,
    visualStyle: video.topicCluster === "A" ? "editorial close-up" : "handheld documentary",
    durationSec: video.durationSec,
    hook: video.hookStyle,
    hookScore,
    hookReasons: reasons,
    hasText: true,
    hasFace: video.topicCluster !== "D",
    hasSpeech: true,
    language: "ru",
    tone: video.hookStyle === "Question" ? "curious" : "direct",
    structure: "hook → proof → cta",
    cta: video.id === "vid_04" ? CTA.profile : CTA.link,
    audience: "RU-speaking 18–34, visual culture",
    pace: video.durationSec < 18 ? "fast" : "medium",
    infoDensity: hookScore > 80 ? "high" : "low",
    contentScore: total,
    hookSubscore: hookScore,
    topicSubscore: 70 + (video.topicCluster === "A" || video.topicCluster === "B" ? 14 : 0),
    retentionSubscore: video.durationSec <= 23 ? 87 : 61,
    ctaSubscore: video.id === "vid_04" ? 90 : 70,
    conversionSubscore: conversion,
    provider: "local_engine",
  };
}

type SeedBundle = {
  accounts: ReturnType<typeof accountRows>;
  networks: typeof DEMO_NETWORKS;
  videos: typeof DEMO_VIDEOS;
  analyses: ReturnType<typeof analysisFor>[];
  tasks: TaskSeed[];
  analytics: AnalyticSeed[];
  velocity: { id: string; taskId: string; window: string; views: number }[];
  experiments: ExperimentSeed[];
  recs: RecSeed[];
  notifications: NotifSeed[];
  clusters: { id: string; name: string; tags: string }[];
};

type TaskSeed = {
  id: string;
  accountId: string;
  videoId: string;
  scheduledAt: Date;
  status: string;
  caption: string;
  hashtags: string;
  cta: string;
  cluster: string;
  pred: { vlo: number; vhi: number; plo: number; phi: number; clo: number; chi: number; conf: number };
  publishedAt: Date | null;
  error: string | null;
  idem: string;
};

type AnalyticSeed = {
  id: string;
  taskId: string;
  accountId: string;
  videoId: string;
  views: number;
  reach: number;
  profileVisits: number;
  linkClicks: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  retention: number;
};

type ExperimentSeed = {
  id: string;
  accountId: string;
  kind: string;
  name: string;
  a: string;
  b: string;
  hold: string;
  status: string;
  winner: string | null;
  sa: number;
  sb: number;
  ma: number;
  mb: number;
  notes: string;
};

type RecSeed = {
  id: string;
  accountId: string | null;
  body: string;
  reason: string;
  confidence: number;
};

type NotifSeed = {
  id: string;
  kind: string;
  title: string;
  body: string;
  accountId: string | null;
  videoId: string | null;
};

function accountRows() {
  return DEMO_ACCOUNTS.map((a, i) => ({
    ...a,
    networkId: DEMO_NETWORKS[i]!.id,
  }));
}

function captionFor(videoId: string, handle: string) {
  if (videoId === "vid_04") return `${CTA.profile}\n\n@${handle}`;
  if (videoId === "vid_02") return "Новый ролик. Like and follow!";
  if (videoId === "vid_03") return `${CTA.link}\nНе ожидал, что так зайдёт — разбор в профиле.`;
  return `${CTA.profile}`;
}

function ctaFor(videoId: string) {
  if (videoId === "vid_04" || videoId === "vid_01") return CTA.profile;
  if (videoId === "vid_08") return CTA.follow;
  return CTA.link;
}

export function buildDemoSeed(now = new Date()): SeedBundle {
  const rng = mulberry32(20260913);
  const networks = DEMO_NETWORKS;
  const accounts = accountRows();
  const videos = DEMO_VIDEOS;
  const analyses = videos.map(analysisFor);

  const tasks: TaskSeed[] = [];
  const analytics: AnalyticSeed[] = [];
  const velocity: SeedBundle["velocity"] = [];

  // Historical publications (learning set) — last 28 days, ~10 per account
  accounts.forEach((acc, ai) => {
    for (let k = 0; k < 10; k++) {
      const video = videos[(k + ai) % videos.length]!;
      const dayOffset = 28 - k * 2;
      const hour = [19, 14, 21, 11, 18, 9][(k + ai) % 6]!;
      const when = new Date(now.getTime() - dayOffset * 86400000);
      when.setUTCHours(hour, 0, 0, 0);
      const id = `task_hist_${acc.id}_${k}`;
      const base = acc.id === "acc_city" ? 9200 : acc.id === "acc_north" ? 5400 : 2100;
      const hookBoost = video.hookStyle === "Long intro" || video.hookStyle === "Generic" ? 0.32 : 1;
      const hourBoost = hour === acc.bestHour ? 1.38 : hour >= 18 && hour <= 21 ? 1.18 : 0.82;
      const viral = acc.id === "acc_city" && video.id === "vid_03" && k === 2;
      const views = viral
        ? 81200
        : Math.round(base * hookBoost * hourBoost * (0.75 + rng() * 0.5));
      const reach = Math.round(views * (0.72 + rng() * 0.16));
      const pvr = video.id === "vid_04" ? 0.078 : video.id === "vid_08" ? 0.021 : 0.046 + rng() * 0.02;
      const profileVisits = Math.round(reach * pvr);
      const lcr = video.id === "vid_04" ? 0.24 : video.id === "vid_08" ? 0.06 : 0.14 + rng() * 0.06;
      const linkClicks = Math.round(profileVisits * lcr);
      tasks.push({
        id,
        accountId: acc.id,
        videoId: video.id,
        scheduledAt: when,
        status: "published",
        caption: captionFor(video.id, acc.handle),
        hashtags: CLUSTERS[video.topicCluster] ?? CLUSTERS.A,
        cta: ctaFor(video.id),
        cluster: video.topicCluster,
        pred: predict(views),
        publishedAt: when,
        error: null,
        idem: `idem_${id}`,
      });
      analytics.push({
        id: `an_${id}`,
        taskId: id,
        accountId: acc.id,
        videoId: video.id,
        views,
        reach,
        profileVisits,
        linkClicks,
        likes: Math.round(views * 0.042),
        comments: Math.round(views * 0.004),
        saves: Math.round(views * 0.011),
        shares: Math.round(views * 0.007),
        retention: video.hookStyle === "Long intro" ? 0.29 : 0.54 + rng() * 0.18,
      });
      if (viral) {
        const curve = [1200, 5400, 18000, 46000, 81200];
        const labels = ["0-1h", "1-3h", "3-6h", "6-12h", "12-24h"];
        labels.forEach((w, i) =>
          velocity.push({ id: nid("vel"), taskId: id, window: w, views: curve[i]! }),
        );
      }
    }
  });

  // Acceptance: 4 videos × 3 accounts = 12 tasks, future/recent schedule
  const startHours: Record<string, number[]> = {
    acc_north: [10, 14, 18, 22],
    acc_craft: [9, 14, 19, 0],
    acc_city: [8, 14, 20, 2],
  };
  const four = videos.slice(0, 4);
  accounts.forEach((acc) => {
    const hours = startHours[acc.id] ?? [10, 14, 18, 22];
    four.forEach((video, i) => {
      const when = new Date(now.getTime());
      const dayAdd = i < 2 ? 0 : 1;
      when.setUTCDate(when.getUTCDate() + dayAdd);
      when.setUTCHours(hours[i]!, 0, 0, 0);
      const id = `task_grid_${acc.id}_${video.id}`;
      const isPast = when.getTime() < now.getTime() - 3600000;
      const status = isPast ? "published" : i === 0 ? "pending_approval" : "queued";
      tasks.push({
        id,
        accountId: acc.id,
        videoId: video.id,
        scheduledAt: when,
        status,
        caption: captionFor(video.id, acc.handle),
        hashtags: CLUSTERS[video.topicCluster] ?? CLUSTERS.A,
        cta: ctaFor(video.id),
        cluster: video.topicCluster,
        pred: predict(acc.id === "acc_city" ? 14000 : acc.id === "acc_north" ? 8000 : 2500),
        publishedAt: status === "published" ? when : null,
        error: null,
        idem: `idem_${id}`,
      });
      if (status === "published") {
        const views = Math.round((acc.id === "acc_city" ? 11000 : 4200) * (0.8 + rng() * 0.4));
        const reach = Math.round(views * 0.8);
        const profileVisits = Math.round(reach * 0.05);
        analytics.push({
          id: `an_${id}`,
          taskId: id,
          accountId: acc.id,
          videoId: video.id,
          views,
          reach,
          profileVisits,
          linkClicks: Math.round(profileVisits * 0.16),
          likes: Math.round(views * 0.04),
          comments: Math.round(views * 0.003),
          saves: Math.round(views * 0.01),
          shares: Math.round(views * 0.006),
          retention: 0.51,
        });
      }
    });
  });

  const experiments: ExperimentSeed[] = [
    {
      id: "exp_cta_north",
      accountId: "acc_north",
      kind: "CTA",
      name: "CTA A vs CTA B",
      a: CTA.profile,
      b: CTA.follow,
      hold: "topic, duration, hashtag cluster",
      status: "running",
      winner: null,
      sa: 6,
      sb: 5,
      ma: 0.071,
      mb: 0.039,
      notes: "Недостаточно данных для уверенного вывода. Нужно ~8 сопоставимых публикаций.",
    },
    {
      id: "exp_hook_city",
      accountId: "acc_city",
      kind: "Hook",
      name: "Question vs Unexpected fact",
      a: "Question",
      b: "Unexpected fact",
      hold: "length 15–21s, evening slot",
      status: "winner",
      winner: "B",
      sa: 12,
      sb: 11,
      ma: 9800,
      mb: 16400,
      notes: "По views вариант B выше. Это корреляция на выборке аккаунта, не универсальная причина.",
    },
    {
      id: "exp_hash_craft",
      accountId: "acc_craft",
      kind: "Hashtag",
      name: "Cluster D vs Cluster C",
      a: "Cluster D",
      b: "Cluster C",
      hold: "CTA, caption length",
      status: "inconclusive",
      winner: null,
      sa: 4,
      sb: 4,
      ma: 1900,
      mb: 2050,
      notes: "Not enough data. Need approximately 12 additional comparable publications.",
    },
  ];

  const recs: RecSeed[] = [
    {
      id: "rec_1",
      accountId: "acc_north",
      body: "Публиковать @north.atelier около 19:00",
      reason: "За последние слоты 18–21ч средний views выше на ~38% относительно утренних.",
      confidence: 84,
    },
    {
      id: "rec_2",
      accountId: "acc_north",
      body: "Короткий question-hook, 17–21 сек",
      reason: "Ролики 14–23 сек с вопросом в 0–2 сек дают лучший profile visit rate.",
      confidence: 78,
    },
    {
      id: "rec_3",
      accountId: "acc_city",
      body: "Topic cluster B + CTA на профиль",
      reason: "Viral outlier vid_03 сидел в cluster B. Не копировать ролик — брать признаки.",
      confidence: 81,
    },
    {
      id: "rec_4",
      accountId: "acc_craft",
      body: "Избегать длинного интро",
      reason: "vid_02 ниже медианы аккаунта. Слабые первые 2 секунды.",
      confidence: 76,
    },
    {
      id: "rec_5",
      accountId: "acc_north",
      body: "Не менять хештеги и CTA в одном эксперименте",
      reason: "Controlled experiments: одна переменная.",
      confidence: 90,
    },
    {
      id: "rec_6",
      accountId: "acc_city",
      body: "Ротация тем — риск content fatigue по Hook craft",
      reason: "Повтор question-hook на соседних слотах совпал с падением retention.",
      confidence: 64,
    },
  ];

  const notifications: NotifSeed[] = [
    {
      id: "nt_viral",
      kind: "viral",
      title: "VIRAL ALERT · @city.notes",
      body: "Video «Я не ожидал этот результат» · 81K views при медиане аккаунта ~9K (+800%). AI-разбор признаков запущен. Копии ролика автоматически не публикуются.",
      accountId: "acc_city",
      videoId: "vid_03",
    },
    {
      id: "nt_fatigue",
      kind: "fatigue",
      title: "CONTENT FATIGUE · @north.atelier",
      body: "Тема Hook craft повторяется. Предложить cluster D / новый hook pattern.",
      accountId: "acc_north",
      videoId: "vid_07",
    },
    {
      id: "nt_approval",
      kind: "approval",
      title: "Ждёт подтверждения",
      body: "AI подготовил публикации. Require approval включён.",
      accountId: null,
      videoId: null,
    },
  ];

  const clusters = Object.entries(CLUSTERS).map(([name, tags]) => ({
    id: `hc_${name}`,
    name: `Cluster ${name}`,
    tags,
  }));

  return {
    accounts,
    networks,
    videos,
    analyses,
    tasks,
    analytics,
    velocity,
    experiments,
    recs,
    notifications,
    clusters,
  };
}

function predict(center: number) {
  return {
    vlo: Math.round(center * 0.55),
    vhi: Math.round(center * 1.6),
    plo: Math.round(center * 0.03),
    phi: Math.round(center * 0.08),
    clo: Math.round(center * 0.006),
    chi: Math.round(center * 0.02),
    conf: 71,
  };
}

export { CTA, CLUSTERS };
