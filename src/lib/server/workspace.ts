import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { nid } from "@/lib/utils";
import { median } from "@/lib/utils";
import {
  buildProfile,
  confidenceFromSample,
  factorBars,
  funnelFrom,
  hourFromIso,
  outlierFlag,
  performanceScore,
  predictFor,
  rate,
  weekdayFromIso,
} from "@/lib/engine";
import { analysisFor, buildDemoSeed, CTA, CLUSTERS, DEMO_VIDEOS } from "@/lib/seed-data";
import { geminiCopy, localCasinoCopy, sendTelegram } from "@/lib/copy-engine";
import { containerStatus, createReelContainer, oauthDialogUrl, publishContainer } from "@/lib/meta-graph";
import type {
  AiProfile,
  Experiment,
  IgAccount,
  NetworkProfile,
  NotificationRow,
  PublicationTask,
  Recommendation,
  ScoredRow,
  TaskStatus,
  Video,
  VideoAnalytic,
  VideoAnalysis,
  WorkspaceSnapshot,
} from "@/lib/types";

async function ensureSeeded(userId: string) {
  const sql = await getSql();
  const meta = await sql<{ seeded: boolean }>`select seeded from cc_meta where user_id = ${userId}`;
  if (meta[0]?.seeded) return;
  await sql`insert into cc_meta (user_id, seeded, paused_all, role) values (${userId}, false, false, 'OWNER') on conflict (user_id) do nothing`;
  const existing = await sql<{ n: number }>`select count(*)::int as n from ig_accounts where user_id = ${userId}`;
  if ((existing[0]?.n ?? 0) > 0) {
    await sql`update cc_meta set seeded = true where user_id = ${userId}`;
    return;
  }
  const seed = buildDemoSeed();
  const now = new Date().toISOString();
  const slug = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "u";
  const p = (id: string) => `${slug}_${id}`;

  for (const n of seed.networks) {
    await sql`insert into network_profiles (id, user_id, name, region, proxy_host, proxy_kind, status, latency_ms, last_check, warning)
      values (${p(n.id)}, ${userId}, ${n.name}, ${n.region}, ${n.proxyHost}, ${n.proxyKind}, ${n.status}, ${n.latencyMs}, ${now}, ${n.warning})`;
  }
  for (const a of seed.accounts) {
    await sql`insert into ig_accounts (id, user_id, handle, display_name, niche, language, status, mode, require_approval, interval_hours, timezone, network_profile_id, followers, bio, profile_link, meta_connected)
      values (${p(a.id)}, ${userId}, ${a.handle}, ${a.displayName}, ${a.niche}, ${a.language}, 'ACTIVE', ${a.id === "acc_craft" ? "AUTOPILOT" : "MANUAL"}, ${a.id !== "acc_craft"}, ${a.intervalHours}, 'Asia/Tashkent', ${p(a.networkId)}, ${a.followers}, ${a.bio}, ${a.profileLink}, false)`;
  }
  for (const v of seed.videos) {
    await sql`insert into videos (id, user_id, title, duration_sec, topic, topic_cluster, hook_style, language, status, thumbnail_seed, original_name)
      values (${p(v.id)}, ${userId}, ${v.title}, ${v.durationSec}, ${v.topic}, ${v.topicCluster}, ${v.hookStyle}, 'ru', 'ready', ${v.seed}, ${v.title + ".mp4"})`;
  }
  for (const an of seed.analyses) {
    await sql`insert into ai_video_analysis (video_id, user_id, analysis_hash, topic, category, visual_style, duration_sec, hook, hook_score, hook_reasons, has_text, has_face, has_speech, language, tone, structure, cta, audience, pace, info_density, content_score, hook_subscore, topic_subscore, retention_subscore, cta_subscore, conversion_subscore, provider)
      values (${p(an.videoId)}, ${userId}, ${an.analysisHash}, ${an.topic}, ${an.category}, ${an.visualStyle}, ${an.durationSec}, ${an.hook}, ${an.hookScore}, ${JSON.stringify(an.hookReasons)}, ${an.hasText}, ${an.hasFace}, ${an.hasSpeech}, ${an.language}, ${an.tone}, ${an.structure}, ${an.cta}, ${an.audience}, ${an.pace}, ${an.infoDensity}, ${an.contentScore}, ${an.hookSubscore}, ${an.topicSubscore}, ${an.retentionSubscore}, ${an.ctaSubscore}, ${an.conversionSubscore}, ${an.provider})`;
  }
  for (const t of seed.tasks) {
    await sql`insert into publication_tasks (id, user_id, account_id, video_id, scheduled_at, status, caption, hashtags, cta, hashtag_cluster, predicted_views_lo, predicted_views_hi, predicted_profile_lo, predicted_profile_hi, predicted_clicks_lo, predicted_clicks_hi, prediction_confidence, attempt_count, error, idempotency_key, published_at)
      values (${p(t.id)}, ${userId}, ${p(t.accountId)}, ${p(t.videoId)}, ${t.scheduledAt.toISOString()}, ${t.status}, ${t.caption}, ${t.hashtags}, ${t.cta}, ${t.cluster}, ${t.pred.vlo}, ${t.pred.vhi}, ${t.pred.plo}, ${t.pred.phi}, ${t.pred.clo}, ${t.pred.chi}, ${t.pred.conf}, 0, ${t.error}, ${slug + "_" + t.idem}, ${t.publishedAt ? t.publishedAt.toISOString() : null})`;
  }
  for (const a of seed.analytics) {
    await sql`insert into video_analytics (id, user_id, task_id, account_id, video_id, hours_after, views, reach, profile_visits, link_clicks, likes, comments, saves, shares, retention, source)
      values (${p(a.id)}, ${userId}, ${p(a.taskId)}, ${p(a.accountId)}, ${p(a.videoId)}, 24, ${a.views}, ${a.reach}, ${a.profileVisits}, ${a.linkClicks}, ${a.likes}, ${a.comments}, ${a.saves}, ${a.shares}, ${a.retention}, 'demo_workspace')`;
  }
  for (const v of seed.velocity) {
    await sql`insert into analytics_velocity (id, user_id, task_id, window_label, views, source)
      values (${nid("vel")}, ${userId}, ${p(v.taskId)}, ${v.window}, ${v.views}, 'demo_workspace')`;
  }
  for (const e of seed.experiments) {
    await sql`insert into experiments (id, user_id, account_id, kind, name, variant_a, variant_b, hold_constant, status, winner, sample_a, sample_b, metric_a, metric_b, notes)
      values (${p(e.id)}, ${userId}, ${p(e.accountId)}, ${e.kind}, ${e.name}, ${e.a}, ${e.b}, ${e.hold}, ${e.status}, ${e.winner}, ${e.sa}, ${e.sb}, ${e.ma}, ${e.mb}, ${e.notes})`;
  }
  const today = new Date().toISOString().slice(0, 10);
  for (const r of seed.recs) {
    await sql`insert into ai_recommendations (id, user_id, account_id, rec_date, body, reason, confidence)
      values (${p(r.id)}, ${userId}, ${r.accountId ? p(r.accountId) : null}, ${today}, ${r.body}, ${r.reason}, ${r.confidence})`;
  }
  for (const n of seed.notifications) {
    await sql`insert into notifications (id, user_id, kind, title, body, account_id, video_id)
      values (${p(n.id)}, ${userId}, ${n.kind}, ${n.title}, ${n.body}, ${n.accountId ? p(n.accountId) : null}, ${n.videoId ? p(n.videoId) : null})`;
  }
  for (const c of seed.clusters) {
    await sql`insert into hashtag_clusters (id, user_id, name, tags)
      values (${p(c.id)}, ${userId}, ${c.name}, ${c.tags})`;
  }
  await sql`insert into audit_logs (id, user_id, actor, action, target, detail) values (${nid("log")}, ${userId}, 'system', 'seed', 'workspace', 'Demo workspace loaded. Metrics are a training dataset, not live Instagram API.')`;

  await recomputeProfiles(userId);
  await sql`update cc_meta set seeded = true where user_id = ${userId}`;
}

type AccRow = {
  id: string;
  handle: string;
  display_name: string;
  niche: string;
  language: string;
  status: IgAccount["status"];
  mode: IgAccount["mode"];
  require_approval: boolean;
  interval_hours: number;
  timezone: string;
  network_profile_id: string | null;
  followers: number;
  bio: string;
  profile_link: string;
  meta_connected: boolean;
  meta_access_token?: string;
  ig_business_id?: string;
};

function maskSecret(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (v.length < 8) return v ? "••••" : null;
  return `••••${v.slice(-4)}`;
}

function mapAccount(r: AccRow): IgAccount {
  return {
    id: r.id,
    handle: r.handle,
    displayName: r.display_name,
    niche: r.niche,
    language: r.language,
    status: r.status,
    mode: r.mode,
    requireApproval: r.require_approval,
    intervalHours: r.interval_hours,
    timezone: r.timezone,
    networkProfileId: r.network_profile_id,
    followers: r.followers,
    bio: r.bio,
    profileLink: r.profile_link,
    metaConnected: Boolean(r.meta_connected) || Boolean((r.meta_access_token ?? "").trim()),
    metaTokenHint: maskSecret(r.meta_access_token),
    igBusinessId: (r.ig_business_id ?? "").trim() || null,
  };
}

async function loadAccounts(userId: string): Promise<IgAccount[]> {
  const sql = await getSql();
  const rows = await sql<AccRow>`select * from ig_accounts where user_id = ${userId} order by handle`;
  return rows.map(mapAccount);
}

async function loadIntegrationsPublic(userId: string) {
  const sql = await getSql();
  try {
    const rows = await sql<{
      telegram_bot_token: string;
      telegram_chat_id: string;
      gemini_api_key: string;
      meta_app_id?: string;
      meta_app_secret?: string;
    }>`select telegram_bot_token, telegram_chat_id, gemini_api_key, meta_app_id, meta_app_secret from user_integrations where user_id = ${userId}`;
    const r = rows[0];
    return {
      telegramBotSet: Boolean(r?.telegram_bot_token),
      telegramBotHint: maskSecret(r?.telegram_bot_token),
      telegramChatId: r?.telegram_chat_id ?? "",
      geminiSet: Boolean(r?.gemini_api_key),
      geminiHint: maskSecret(r?.gemini_api_key),
      metaAppId: r?.meta_app_id ?? "",
      metaAppSet: Boolean(r?.meta_app_secret),
    };
  } catch {
    return {
      telegramBotSet: false,
      telegramBotHint: null,
      telegramChatId: "",
      geminiSet: false,
      geminiHint: null,
      metaAppId: "",
      metaAppSet: false,
    };
  }
}

async function loadAnalytics(userId: string, accountId?: string): Promise<VideoAnalytic[]> {
  const sql = await getSql();
  const rows = accountId
    ? await sql<Record<string, unknown>>`select * from video_analytics where user_id = ${userId} and account_id = ${accountId} and hours_after = 24`
    : await sql<Record<string, unknown>>`select * from video_analytics where user_id = ${userId} and hours_after = 24`;
  return rows.map(mapAnalytic);
}

function mapAnalytic(r: Record<string, unknown>): VideoAnalytic {
  return {
    id: String(r.id),
    taskId: (r.task_id as string) ?? null,
    accountId: String(r.account_id),
    videoId: String(r.video_id),
    hoursAfter: Number(r.hours_after ?? 24),
    views: r.views == null ? null : Number(r.views),
    reach: r.reach == null ? null : Number(r.reach),
    profileVisits: r.profile_visits == null ? null : Number(r.profile_visits),
    linkClicks: r.link_clicks == null ? null : Number(r.link_clicks),
    likes: r.likes == null ? null : Number(r.likes),
    comments: r.comments == null ? null : Number(r.comments),
    saves: r.saves == null ? null : Number(r.saves),
    shares: r.shares == null ? null : Number(r.shares),
    retention: r.retention == null ? null : Number(r.retention),
    source: (r.source as VideoAnalytic["source"]) ?? "demo_workspace",
  };
}

async function recomputeProfiles(userId: string) {
  const sql = await getSql();
  const accounts = await loadAccounts(userId);
  const videos = await sql<{ id: string; topic: string; hook_style: string; duration_sec: number }>`select id, topic, hook_style, duration_sec from videos where user_id = ${userId}`;
  const vMap = new Map(videos.map((v) => [v.id, v]));
  const tasks = await sql<{ id: string; account_id: string; video_id: string; scheduled_at: string; caption: string; cta: string; hashtag_cluster: string; status: string }>`select id, account_id, video_id, scheduled_at::text as scheduled_at, caption, cta, hashtag_cluster, status from publication_tasks where user_id = ${userId} and status = 'published'`;
  const analytics = await loadAnalytics(userId);
  const anByTask = new Map(analytics.filter((a) => a.taskId).map((a) => [a.taskId!, a]));

  for (const acc of accounts) {
    const hist = tasks
      .filter((t) => t.account_id === acc.id)
      .map((t) => {
        const an = anByTask.get(t.id);
        const v = vMap.get(t.video_id);
        if (!an || an.views == null) return null;
        return {
          accountId: acc.id,
          videoId: t.video_id,
          hour: hourFromIso(t.scheduled_at),
          weekday: weekdayFromIso(t.scheduled_at),
          topic: v?.topic ?? "",
          hook: v?.hook_style ?? "",
          duration: v?.duration_sec ?? 0,
          captionLen: t.caption.length,
          cta: t.cta,
          cluster: t.hashtag_cluster,
          views: an.views,
          reach: an.reach ?? an.views,
          profileVisits: an.profileVisits ?? 0,
          linkClicks: an.linkClicks ?? 0,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
    const profile = buildProfile(acc.id, hist);
    await sql`insert into account_ai_profiles (account_id, user_id, best_hours, best_days, best_length_min, best_length_max, best_topics, best_hooks, best_cta, best_hashtag_cluster, best_caption_style, profile_visit_rate, link_click_rate, confidence, sample_size, do_more, do_less, notes, updated_at)
      values (${acc.id}, ${userId}, ${JSON.stringify(profile.bestHours)}, ${JSON.stringify(profile.bestDays)}, ${profile.bestLengthMin}, ${profile.bestLengthMax}, ${JSON.stringify(profile.bestTopics)}, ${JSON.stringify(profile.bestHooks)}, ${profile.bestCta}, ${profile.bestHashtagCluster}, ${profile.bestCaptionStyle}, ${profile.profileVisitRate}, ${profile.linkClickRate}, ${profile.confidence}, ${profile.sampleSize}, ${JSON.stringify(profile.doMore)}, ${JSON.stringify(profile.doLess)}, ${profile.notes}, ${new Date().toISOString()})
      on conflict (account_id) do update set
        best_hours = excluded.best_hours,
        best_days = excluded.best_days,
        best_length_min = excluded.best_length_min,
        best_length_max = excluded.best_length_max,
        best_topics = excluded.best_topics,
        best_hooks = excluded.best_hooks,
        best_cta = excluded.best_cta,
        best_hashtag_cluster = excluded.best_hashtag_cluster,
        best_caption_style = excluded.best_caption_style,
        profile_visit_rate = excluded.profile_visit_rate,
        link_click_rate = excluded.link_click_rate,
        confidence = excluded.confidence,
        sample_size = excluded.sample_size,
        do_more = excluded.do_more,
        do_less = excluded.do_less,
        notes = excluded.notes,
        updated_at = excluded.updated_at`;
  }
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function mapProfile(r: Record<string, unknown>): AiProfile {
  const hours = parseJsonArray(String(r.best_hours ?? "[]")).map(Number).filter((n) => !Number.isNaN(n));
  return {
    accountId: String(r.account_id),
    bestHours: hours,
    bestDays: parseJsonArray(String(r.best_days ?? "[]")),
    bestLengthMin: r.best_length_min == null ? null : Number(r.best_length_min),
    bestLengthMax: r.best_length_max == null ? null : Number(r.best_length_max),
    bestTopics: parseJsonArray(String(r.best_topics ?? "[]")),
    bestHooks: parseJsonArray(String(r.best_hooks ?? "[]")),
    bestCta: String(r.best_cta ?? ""),
    bestHashtagCluster: String(r.best_hashtag_cluster ?? ""),
    bestCaptionStyle: String(r.best_caption_style ?? ""),
    profileVisitRate: r.profile_visit_rate == null ? null : Number(r.profile_visit_rate),
    linkClickRate: r.link_click_rate == null ? null : Number(r.link_click_rate),
    confidence: Number(r.confidence ?? 0),
    sampleSize: Number(r.sample_size ?? 0),
    doMore: parseJsonArray(String(r.do_more ?? "[]")),
    doLess: parseJsonArray(String(r.do_less ?? "[]")),
    notes: String(r.notes ?? ""),
  };
}

function scoreRows(
  accounts: IgAccount[],
  videos: Video[],
  tasks: PublicationTask[],
  analytics: VideoAnalytic[],
): ScoredRow[] {
  const vMap = new Map(videos.map((v) => [v.id, v]));
  const aMap = new Map(accounts.map((a) => [a.id, a]));
  const byAccount = new Map<string, number[]>();
  for (const an of analytics) {
    if (an.views == null) continue;
    const arr = byAccount.get(an.accountId) ?? [];
    arr.push(an.views);
    byAccount.set(an.accountId, arr);
  }
  const medians = new Map<string, number>();
  for (const [id, vals] of byAccount) medians.set(id, median(vals));

  return analytics.map((an) => {
    const med = medians.get(an.accountId) ?? 0;
    const sample = byAccount.get(an.accountId)?.length ?? 0;
    const reachMed = med * 0.8;
    const pvr = rate(an.profileVisits, an.reach ?? an.views);
    const lcr = rate(an.linkClicks, an.profileVisits);
    const acc = aMap.get(an.accountId);
    const vid = vMap.get(an.videoId);
    const task = tasks.find((t) => t.id === an.taskId);
    return {
      accountId: an.accountId,
      videoId: an.videoId,
      taskId: an.taskId ?? "",
      handle: acc?.handle ?? "",
      title: vid?.title ?? an.videoId,
      views: an.views,
      reach: an.reach,
      profileVisits: an.profileVisits,
      linkClicks: an.linkClicks,
      profileRate: pvr,
      linkRate: lcr,
      performanceScore: performanceScore(an, { medianViews: med || 1, medianReach: reachMed || 1 }),
      outlier: outlierFlag(an.views, med, sample),
      source: an.source,
    };
  }).sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
}

function fatigueFrom(scored: ScoredRow[], videos: Video[], accounts: IgAccount[]) {
  const vMap = new Map(videos.map((v) => [v.id, v]));
  const out: { accountId: string; handle: string; topic: string; message: string }[] = [];
  for (const acc of accounts) {
    const recent = scored.filter((s) => s.accountId === acc.id).slice(0, 6);
    const topics = recent.map((s) => vMap.get(s.videoId)?.topic).filter(Boolean) as string[];
    const counts = new Map<string, number>();
    for (const t of topics) counts.set(t, (counts.get(t) ?? 0) + 1);
    for (const [topic, c] of counts) {
      if (c >= 3) {
        out.push({
          accountId: acc.id,
          handle: acc.handle,
          topic,
          message: `Тема «${topic}» повторяется ${c} раз на коротком окне. CONTENT FATIGUE DETECTED — ротация cluster.`,
        });
      }
    }
  }
  return out;
}

export const getSnapshot = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<WorkspaceSnapshot> => {
    const userId = context.userId;
    await ensureSeeded(userId);
    const sql = await getSql();
    const meta = await sql<{ paused_all: boolean; role: string; seeded: boolean }>`select paused_all, role, seeded from cc_meta where user_id = ${userId}`;
    const accounts = await loadAccounts(userId);
    const nets = await sql<Record<string, unknown>>`select * from network_profiles where user_id = ${userId}`;
    const networks: NetworkProfile[] = nets.map((n) => ({
      id: String(n.id),
      name: String(n.name),
      region: String(n.region ?? ""),
      proxyHost: String(n.proxy_host ?? ""),
      proxyKind: String(n.proxy_kind ?? "none"),
      status: n.status as NetworkProfile["status"],
      latencyMs: n.latency_ms == null ? null : Number(n.latency_ms),
      lastCheck: n.last_check ? String(n.last_check) : null,
      warning: n.warning ? String(n.warning) : null,
    }));
    const videoRows = await sql<Record<string, unknown>>`select * from videos where user_id = ${userId} order by created_at desc`;
    const videos: Video[] = videoRows.map((v) => ({
      id: String(v.id),
      title: String(v.title),
      durationSec: Number(v.duration_sec),
      topic: String(v.topic),
      topicCluster: String(v.topic_cluster),
      hookStyle: String(v.hook_style),
      language: String(v.language),
      status: String(v.status),
      thumbnailSeed: String(v.thumbnail_seed),
      originalName: String(v.original_name ?? ""),
      fileName: String(v.file_name ?? ""),
    }));
    const taskRows = await sql<Record<string, unknown>>`select id, account_id, video_id, scheduled_at::text as scheduled_at, status, caption, hashtags, cta, hashtag_cluster, predicted_views_lo, predicted_views_hi, predicted_profile_lo, predicted_profile_hi, predicted_clicks_lo, predicted_clicks_hi, prediction_confidence, attempt_count, error, idempotency_key, published_at::text as published_at from publication_tasks where user_id = ${userId} order by scheduled_at`;
    const tasks: PublicationTask[] = taskRows.map(mapTask);
    const analytics = await loadAnalytics(userId);
    const profilesRows = await sql<Record<string, unknown>>`select * from account_ai_profiles where user_id = ${userId}`;
    const profiles = profilesRows.map(mapProfile);
    const expRows = await sql<Record<string, unknown>>`select * from experiments where user_id = ${userId} order by created_at desc`;
    const experiments: Experiment[] = expRows.map((e) => ({
      id: String(e.id),
      accountId: String(e.account_id),
      kind: String(e.kind),
      name: String(e.name),
      variantA: String(e.variant_a),
      variantB: String(e.variant_b),
      holdConstant: String(e.hold_constant ?? ""),
      status: String(e.status),
      winner: e.winner ? String(e.winner) : null,
      sampleA: Number(e.sample_a ?? 0),
      sampleB: Number(e.sample_b ?? 0),
      metricA: e.metric_a == null ? null : Number(e.metric_a),
      metricB: e.metric_b == null ? null : Number(e.metric_b),
      notes: String(e.notes ?? ""),
    }));
    const recRows = await sql<Record<string, unknown>>`select * from ai_recommendations where user_id = ${userId} order by created_at desc`;
    const recommendations: Recommendation[] = recRows.map((r) => ({
      id: String(r.id),
      accountId: r.account_id ? String(r.account_id) : null,
      recDate: String(r.rec_date),
      body: String(r.body),
      reason: String(r.reason ?? ""),
      confidence: Number(r.confidence ?? 0),
      accepted: r.accepted == null ? null : Boolean(r.accepted),
      result: r.result ? String(r.result) : null,
    }));
    const nRows = await sql<Record<string, unknown>>`select id, kind, title, body, account_id, video_id, read, created_at::text as created_at from notifications where user_id = ${userId} order by created_at desc`;
    const notifications: NotificationRow[] = nRows.map((n) => ({
      id: String(n.id),
      kind: String(n.kind),
      title: String(n.title),
      body: String(n.body),
      accountId: n.account_id ? String(n.account_id) : null,
      videoId: n.video_id ? String(n.video_id) : null,
      read: Boolean(n.read),
      createdAt: String(n.created_at),
    }));
    const scored = scoreRows(accounts, videos, tasks, analytics);
    const funnel = funnelFrom(analytics);
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const todayPublished = tasks.filter(
      (t) => t.status === "published" && t.publishedAt && new Date(t.publishedAt) >= start,
    ).length;
    const queueDepth = tasks.filter((t) => t.status === "queued" || t.status === "pending_approval").length;
    const errors = tasks.filter((t) => t.status === "failed").length + accounts.filter((a) => a.status === "ERROR").length;
    return {
      pausedAll: Boolean(meta[0]?.paused_all),
      role: meta[0]?.role ?? "OWNER",
      demoSeeded: Boolean(meta[0]?.seeded),
      accounts,
      networks,
      videos,
      tasks,
      analytics,
      profiles,
      experiments,
      recommendations,
      notifications,
      scored,
      funnel,
      todayPublished,
      queueDepth,
      errors,
      viralAlerts: scored.filter((s) => s.outlier === "viral"),
      fatigue: fatigueFrom(scored, videos, accounts),
      integrations: await loadIntegrationsPublic(userId),
    };
  });

function mapTask(t: Record<string, unknown>): PublicationTask {
  return {
    id: String(t.id),
    accountId: String(t.account_id),
    videoId: String(t.video_id),
    scheduledAt: String(t.scheduled_at),
    status: t.status as TaskStatus,
    caption: String(t.caption ?? ""),
    hashtags: String(t.hashtags ?? ""),
    cta: String(t.cta ?? ""),
    hashtagCluster: String(t.hashtag_cluster ?? ""),
    predictedViewsLo: t.predicted_views_lo == null ? null : Number(t.predicted_views_lo),
    predictedViewsHi: t.predicted_views_hi == null ? null : Number(t.predicted_views_hi),
    predictedProfileLo: t.predicted_profile_lo == null ? null : Number(t.predicted_profile_lo),
    predictedProfileHi: t.predicted_profile_hi == null ? null : Number(t.predicted_profile_hi),
    predictedClicksLo: t.predicted_clicks_lo == null ? null : Number(t.predicted_clicks_lo),
    predictedClicksHi: t.predicted_clicks_hi == null ? null : Number(t.predicted_clicks_hi),
    predictionConfidence: t.prediction_confidence == null ? null : Number(t.prediction_confidence),
    attemptCount: Number(t.attempt_count ?? 0),
    error: t.error ? String(t.error) : null,
    idempotencyKey: String(t.idempotency_key),
    publishedAt: t.published_at ? String(t.published_at) : null,
  };
}

export const pauseAll = createServerFn({ method: "POST" })
  .validator((paused: boolean) => paused)
  .middleware([authMiddleware])
  .handler(async ({ context, data: paused }) => {
    const sql = await getSql();
    await sql`update cc_meta set paused_all = ${paused} where user_id = ${context.userId}`;
    await sql`insert into audit_logs (id, user_id, actor, action, detail) values (${nid("log")}, ${context.userId}, 'admin', ${paused ? "PAUSE_ALL" : "RESUME_ALL"}, 'global')`;
    return { ok: true, paused };
  });

export const setAccountStatus = createServerFn({ method: "POST" })
  .validator((input: { id: string; status: IgAccount["status"] }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`update ig_accounts set status = ${data.status} where id = ${data.id} and user_id = ${context.userId}`;
    await sql`insert into audit_logs (id, user_id, actor, action, target) values (${nid("log")}, ${context.userId}, 'admin', ${"account_" + data.status}, ${data.id})`;
    return { ok: true };
  });

export const setAccountMode = createServerFn({ method: "POST" })
  .validator((input: { id: string; mode: IgAccount["mode"]; requireApproval?: boolean }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data.requireApproval != null) {
      await sql`update ig_accounts set mode = ${data.mode}, require_approval = ${data.requireApproval} where id = ${data.id} and user_id = ${context.userId}`;
    } else {
      await sql`update ig_accounts set mode = ${data.mode} where id = ${data.id} and user_id = ${context.userId}`;
    }
    return { ok: true };
  });

export const approveTask = createServerFn({ method: "POST" })
  .validator((input: { id: string; action: "APPROVE" | "REJECT" }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const next = data.action === "APPROVE" ? "queued" : "failed";
    const err = data.action === "REJECT" ? "Rejected by admin" : null;
    await sql`update publication_tasks set status = ${next}, error = ${err} where id = ${data.id} and user_id = ${context.userId}`;
    await sql`insert into audit_logs (id, user_id, actor, action, target) values (${nid("log")}, ${context.userId}, 'admin', ${data.action}, ${data.id})`;
    return { ok: true };
  });

export const updateTaskCopy = createServerFn({ method: "POST" })
  .validator((input: { id: string; caption: string; hashtags: string; cta: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`update publication_tasks set caption = ${data.caption}, hashtags = ${data.hashtags}, cta = ${data.cta} where id = ${data.id} and user_id = ${context.userId}`;
    await sql`insert into audit_logs (id, user_id, actor, action, target) values (${nid("log")}, ${context.userId}, 'admin', 'OVERRIDE_COPY', ${data.id})`;
    return { ok: true };
  });

export const tickScheduler = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const meta = await sql<{ paused_all: boolean }>`select paused_all from cc_meta where user_id = ${context.userId}`;
    if (meta[0]?.paused_all) return { processed: 0, reason: "paused_all" };
    const base = (process.env.BETTER_AUTH_URL || "").replace(/\/+$/, "");
    const due = await sql<{
      id: string;
      account_id: string;
      video_id: string;
      caption: string;
      hashtags: string;
      ig_container_id: string | null;
      status: string;
    }>`
      select t.id, t.account_id, t.video_id, t.caption, t.hashtags, t.ig_container_id, t.status
      from publication_tasks t
      join ig_accounts a on a.id = t.account_id
      where t.user_id = ${context.userId}
        and a.status = 'ACTIVE'
        and (
          (t.status = 'queued' and t.scheduled_at <= ${new Date().toISOString()})
          or (t.status = 'publishing' and t.ig_container_id is not null)
        )
      order by t.scheduled_at
      limit 10`;
    let processed = 0;
    let published = 0;
    for (const row of due) {
      const acc = await sql<{ meta_access_token: string; ig_business_id: string; handle: string }>`
        select meta_access_token, ig_business_id, handle from ig_accounts where id = ${row.account_id} and user_id = ${context.userId}`;
      const token = acc[0]?.meta_access_token?.trim() ?? "";
      const ig = acc[0]?.ig_business_id?.trim() ?? "";
      if (!token || !ig) {
        await sql`update publication_tasks set status = 'awaiting_official_api', error = ${"Нажми «Подключить Instagram» на карточке аккаунта. Пароль не нужен — Meta сама выдаст доступ."} where id = ${row.id} and user_id = ${context.userId}`;
        processed += 1;
        continue;
      }
      if (row.status === "publishing" && row.ig_container_id) {
        try {
          const st = await containerStatus({ containerId: row.ig_container_id, token });
          const code = (st.status_code || st.status || "").toUpperCase();
          if (code === "FINISHED" || code === "PUBLISHED") {
            const pub = await publishContainer({ igUserId: ig, token, containerId: row.ig_container_id });
            await sql`update publication_tasks set status = 'published', ig_media_id = ${pub.id}, published_at = ${new Date().toISOString()}, error = null where id = ${row.id} and user_id = ${context.userId}`;
            published += 1;
          } else if (code === "ERROR" || code === "EXPIRED") {
            await sql`update publication_tasks set status = 'failed', error = ${"Meta отклонила контейнер: " + code} where id = ${row.id} and user_id = ${context.userId}`;
          }
        } catch (e) {
          await sql`update publication_tasks set error = ${e instanceof Error ? e.message : "poll error"} where id = ${row.id} and user_id = ${context.userId}`;
        }
        processed += 1;
        continue;
      }
      const vid = await sql<{ file_name: string; title: string }>`select file_name, title from videos where id = ${row.video_id} and user_id = ${context.userId}`;
      const fileName = vid[0]?.file_name?.trim() ?? "";
      if (!fileName || !base) {
        await sql`update publication_tasks set status = 'awaiting_official_api', error = ${"Нет файла ролика или публичного URL. Залей mp4 заново в Загрузка."} where id = ${row.id} and user_id = ${context.userId}`;
        processed += 1;
        continue;
      }
      const videoUrl = `${base}/media/${fileName}`;
      const caption = [row.caption, row.hashtags].filter(Boolean).join("\n\n");
      try {
        const created = await createReelContainer({ igUserId: ig, token, videoUrl, caption });
        await sql`update publication_tasks set status = 'publishing', ig_container_id = ${created.id}, attempt_count = attempt_count + 1, error = null where id = ${row.id} and user_id = ${context.userId}`;
      } catch (e) {
        await sql`update publication_tasks set status = 'failed', error = ${e instanceof Error ? e.message : "Meta publish error"} where id = ${row.id} and user_id = ${context.userId}`;
      }
      processed += 1;
    }
    if (processed > 0) {
      try {
        const integ = await sql<{ telegram_bot_token: string; telegram_chat_id: string }>`select telegram_bot_token, telegram_chat_id from user_integrations where user_id = ${context.userId}`;
        const tok = integ[0]?.telegram_bot_token?.trim();
        const chat = integ[0]?.telegram_chat_id?.trim();
        if (tok && chat) {
          await sendTelegram(tok, chat, `PULSE: обработано ${processed}, опубликовано ${published}.`);
        }
      } catch {
        /* alerts must never block the queue */
      }
    }
    await sql`insert into audit_logs (id, user_id, actor, action, detail) values (${nid("log")}, ${context.userId}, 'scheduler', 'tick', ${"processed=" + processed + " published=" + published})`;
    return { processed, published };
  });

export const acceptRecommendation = createServerFn({ method: "POST" })
  .validator((input: { id: string; accepted: boolean }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`update ai_recommendations set accepted = ${data.accepted} where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const addAccount = createServerFn({ method: "POST" })
  .validator((input: { handle: string; niche: string; intervalHours: number }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const handle = data.handle.replace(/^@/, "").trim().toLowerCase();
    if (!handle) return { ok: false as const, error: "handle required" };
    const id = nid("acc");
    await sql`insert into ig_accounts (id, user_id, handle, display_name, niche, interval_hours, status, mode, require_approval, timezone, followers, bio, profile_link, meta_connected)
      values (${id}, ${context.userId}, ${handle}, ${handle}, ${data.niche || "unset"}, ${data.intervalHours || 6}, 'ACTIVE', 'MANUAL', true, 'Asia/Tashkent', 0, '', '', false)`;
    await sql`insert into account_ai_profiles (account_id, user_id, confidence, sample_size, notes, do_more, do_less)
      values (${id}, ${context.userId}, 18, 0, ${"Cold start: недостаточно своей статистики. Account data must override generic assumptions после накопления."}, ${JSON.stringify(["Controlled experiments", "Короткий hook"])}, ${JSON.stringify(["Выводы на 1 ролике"])})`;
    return { ok: true as const, id };
  });

export const addVideo = createServerFn({ method: "POST" })
  .validator((input: { title: string; durationSec: number; topic: string; hookStyle: string; cluster: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const res = await addVideoInner(context.userId, data);
    return { ok: true as const, id: res.id };
  });

export const massAssign = createServerFn({ method: "POST" })
  .validator((input: { videoIds: string[]; accountIds: string[] }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const accounts = await loadAccounts(context.userId);
    const selected = accounts.filter((a) => data.accountIds.includes(a.id));
    const videos = await sql<{ id: string; title: string; duration_sec: number; topic: string; hook_style: string; topic_cluster: string }>`select id, title, duration_sec, topic, hook_style, topic_cluster from videos where user_id = ${context.userId}`;
    const analytics = await loadAnalytics(context.userId);
    const profilesRows = await sql<Record<string, unknown>>`select * from account_ai_profiles where user_id = ${context.userId}`;
    const profiles = profilesRows.map(mapProfile);
    let geminiKey = "";
    try {
      const integRows = await sql<{ gemini_api_key: string }>`select gemini_api_key from user_integrations where user_id = ${context.userId}`;
      geminiKey = integRows[0]?.gemini_api_key?.trim() ?? "";
    } catch {
      geminiKey = "";
    }
    const created: string[] = [];
    const now = Date.now();
    for (const acc of selected) {
      const prof = profiles.find((p) => p.accountId === acc.id);
      const hour = prof?.bestHours[0] ?? 19;
      const accAn = analytics.filter((a) => a.accountId === acc.id && a.views != null);
      const sample = accAn.map((a) => ({
        views: a.views ?? 0,
        profileVisits: a.profileVisits ?? 0,
        linkClicks: a.linkClicks ?? 0,
      }));
      let offset = 0;
      for (const vid of videos.filter((v) => data.videoIds.includes(v.id))) {
        const when = new Date(now + offset * acc.intervalHours * 3600000);
        when.setUTCMinutes(0, 0, 0);
        if (prof?.bestHours.length) {
          const target = prof.bestHours[offset % prof.bestHours.length]!;
          when.setUTCHours(target);
        } else {
          when.setUTCHours(hour);
        }
        const idem = `assign_${acc.id}_${vid.id}_${when.toISOString()}`;
        const exists = await sql<{ id: string }>`select id from publication_tasks where user_id = ${context.userId} and idempotency_key = ${idem}`;
        if (exists[0]) continue;
        const pred = predictFor({ sample, hourBoost: 1 });
        const copy = geminiKey
          ? await geminiCopy({
              apiKey: geminiKey,
              title: vid.title,
              niche: acc.niche,
              handle: acc.handle,
              durationSec: vid.duration_sec,
            })
          : localCasinoCopy({ title: vid.title, niche: acc.niche, handle: acc.handle });
        const caption = copy.caption;
        const tags = copy.hashtags;
        const status = acc.requireApproval ? "pending_approval" : "queued";
        const id = nid("task");
        await sql`insert into publication_tasks (id, user_id, account_id, video_id, scheduled_at, status, caption, hashtags, cta, hashtag_cluster, predicted_views_lo, predicted_views_hi, predicted_profile_lo, predicted_profile_hi, predicted_clicks_lo, predicted_clicks_hi, prediction_confidence, idempotency_key)
          values (${id}, ${context.userId}, ${acc.id}, ${vid.id}, ${when.toISOString()}, ${status}, ${caption}, ${tags}, ${copy.cta}, ${vid.topic_cluster}, ${pred.viewsLo}, ${pred.viewsHi}, ${pred.profileLo}, ${pred.profileHi}, ${pred.clicksLo}, ${pred.clicksHi}, ${pred.confidence}, ${idem})`;
        created.push(id);
        offset += 1;
      }
    }
    await sql`insert into audit_logs (id, user_id, actor, action, detail) values (${nid("log")}, ${context.userId}, 'admin', 'MASS_ASSIGN', ${"tasks=" + created.length})`;
    return { ok: true as const, created: created.length };
  });

export const getVideoDetail = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    await ensureSeeded(context.userId);
    const sql = await getSql();
    const v = await sql<Record<string, unknown>>`select * from videos where id = ${id} and user_id = ${context.userId}`;
    if (!v[0]) return null;
    const an = await sql<Record<string, unknown>>`select * from ai_video_analysis where video_id = ${id} and user_id = ${context.userId}`;
    const tasks = await sql<Record<string, unknown>>`select id, account_id, video_id, scheduled_at::text as scheduled_at, status, caption, hashtags, cta, hashtag_cluster, predicted_views_lo, predicted_views_hi, predicted_profile_lo, predicted_profile_hi, predicted_clicks_lo, predicted_clicks_hi, prediction_confidence, attempt_count, error, idempotency_key, published_at::text as published_at from publication_tasks where video_id = ${id} and user_id = ${context.userId} order by scheduled_at`;
    const analytics = await sql<Record<string, unknown>>`select * from video_analytics where video_id = ${id} and user_id = ${context.userId}`;
    const analysis: VideoAnalysis | null = an[0]
      ? {
          videoId: String(an[0].video_id),
          analysisHash: String(an[0].analysis_hash),
          topic: String(an[0].topic),
          category: String(an[0].category),
          visualStyle: String(an[0].visual_style),
          durationSec: an[0].duration_sec == null ? null : Number(an[0].duration_sec),
          hook: String(an[0].hook),
          hookScore: an[0].hook_score == null ? null : Number(an[0].hook_score),
          hookReasons: parseJsonArray(String(an[0].hook_reasons ?? "[]")),
          hasText: an[0].has_text == null ? null : Boolean(an[0].has_text),
          hasFace: an[0].has_face == null ? null : Boolean(an[0].has_face),
          hasSpeech: an[0].has_speech == null ? null : Boolean(an[0].has_speech),
          language: String(an[0].language),
          tone: String(an[0].tone),
          structure: String(an[0].structure),
          cta: String(an[0].cta),
          audience: String(an[0].audience),
          pace: String(an[0].pace),
          infoDensity: String(an[0].info_density),
          contentScore: an[0].content_score == null ? null : Number(an[0].content_score),
          hookSubscore: an[0].hook_subscore == null ? null : Number(an[0].hook_subscore),
          topicSubscore: an[0].topic_subscore == null ? null : Number(an[0].topic_subscore),
          retentionSubscore: an[0].retention_subscore == null ? null : Number(an[0].retention_subscore),
          ctaSubscore: an[0].cta_subscore == null ? null : Number(an[0].cta_subscore),
          conversionSubscore: an[0].conversion_subscore == null ? null : Number(an[0].conversion_subscore),
          provider: String(an[0].provider),
        }
      : null;
    const accounts = await loadAccounts(context.userId);
    const videos: Video[] = [
      {
        id: String(v[0].id),
        title: String(v[0].title),
        durationSec: Number(v[0].duration_sec),
        topic: String(v[0].topic),
        topicCluster: String(v[0].topic_cluster),
        hookStyle: String(v[0].hook_style),
        language: String(v[0].language),
        status: String(v[0].status),
        thumbnailSeed: String(v[0].thumbnail_seed),
        originalName: String(v[0].original_name ?? ""),
        fileName: String(v[0].file_name ?? ""),
      },
    ];
    const mappedTasks = tasks.map(mapTask);
    const mappedAn = analytics.map(mapAnalytic);
    const scored = scoreRows(accounts, videos, mappedTasks, mappedAn);
    const profilesRows = await sql<Record<string, unknown>>`select * from account_ai_profiles where user_id = ${context.userId}`;
    const profile = profilesRows.map(mapProfile)[0];
    const why = scored[0] ? factorBars(scored[0], profile, analysis?.hookScore ?? null) : [];
    const vel = await sql<{ window_label: string; views: number }>`select window_label, views from analytics_velocity where user_id = ${context.userId} and task_id in (select id from publication_tasks where video_id = ${id} and user_id = ${context.userId})`;
    return {
      video: videos[0],
      analysis,
      tasks: mappedTasks,
      analytics: mappedAn,
      scored,
      why,
      velocity: vel.map((x) => ({ window: x.window_label, views: Number(x.views) })),
    };
  });

export const grokExplain = createServerFn({ method: "POST" })
  .validator((input: { kind: "strategy" | "why" | "caption" | "daily"; payload: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI недоступен в этой среде. Локальный движок уже посчитал профиль." };
    }
    const system =
      "Ты AI-аналитик органического роста Instagram. Главные метрики: video views, reach, profile visits, link clicks. Не утверждай причинность без выборки. Не предлагай накрутку, ботов, обход ограничений. Отвечай кратко, по-русски, с указанием что это корреляция и confidence.";
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 500,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `${data.kind}\n${data.payload}` },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `xAI API error ${res.status}` };
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    return { ok: true as const, text: body.choices[0]?.message.content ?? "" };
  });

export const healthCheck = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    let db = "ok";
    try {
      await sql`select 1 as n`;
    } catch {
      db = "error";
    }
    return {
      api: "ok",
      database: db,
      redis: "N/A",
      worker: "in-process",
      scheduler: "in-process",
      storage: "metadata-only",
      ai: process.env.XAI_API_KEY ? "ok" : "unavailable",
      meta: "not_connected",
    };
  });

export const logsFor = createServerFn({ method: "GET" })
  .validator((accountId: string | null) => accountId)
  .middleware([authMiddleware])
  .handler(async ({ context, data: accountId }) => {
    const sql = await getSql();
    const rows = accountId
      ? await sql<{ id: string; actor: string; action: string; target: string; detail: string; created_at: string }>`select id, actor, action, target, detail, created_at::text as created_at from audit_logs where user_id = ${context.userId} and (target = ${accountId} or detail like ${"%" + accountId + "%"}) order by created_at desc limit 40`
      : await sql<{ id: string; actor: string; action: string; target: string; detail: string; created_at: string }>`select id, actor, action, target, detail, created_at::text as created_at from audit_logs where user_id = ${context.userId} order by created_at desc limit 40`;
    return rows;
  });

export const ingestVideos = createServerFn({ method: "POST" })
  .validator(
    (input: {
      items: Array<{
        title: string;
        durationSec: number;
        topic: string;
        hookStyle: string;
        cluster: string;
        originalName: string;
        fileSizeKb: number;
      }>;
    }) => input,
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const created: string[] = [];
    for (const item of data.items.slice(0, 40)) {
      const res = await addVideoInner(context.userId, item);
      created.push(res.id);
    }
    await sqlAudit(context.userId, "INGEST", `videos=${created.length}`);
    return { ok: true as const, ids: created };
  });

async function addVideoInner(
  userId: string,
  data: {
    title: string;
    durationSec: number;
    topic: string;
    hookStyle: string;
    cluster: string;
    originalName?: string;
    fileSizeKb?: number;
  },
) {
  const sql = await getSql();
  const id = nid("vid");
  const cluster = (data.cluster || "A").slice(0, 1).toUpperCase();
  const title = data.title.trim() || data.originalName || "Untitled";
  await sql`insert into videos (id, user_id, title, duration_sec, topic, topic_cluster, hook_style, language, status, thumbnail_seed, original_name, file_size_kb)
    values (${id}, ${userId}, ${title}, ${data.durationSec || 18}, ${data.topic || "General"}, ${cluster}, ${data.hookStyle || "Question"}, 'ru', 'ready', ${String((Date.now() % 9) + 1)}, ${data.originalName || title + ".mp4"}, ${data.fileSizeKb ?? null})`;
  const fake = {
    id,
    title,
    durationSec: data.durationSec || 18,
    topic: data.topic || "General",
    topicCluster: cluster,
    hookStyle: data.hookStyle || "Question",
    seed: "9",
  };
  const an = analysisFor(fake as (typeof DEMO_VIDEOS)[number]);
  await sql`insert into ai_video_analysis (video_id, user_id, analysis_hash, topic, category, visual_style, duration_sec, hook, hook_score, hook_reasons, has_text, has_face, has_speech, language, tone, structure, cta, audience, pace, info_density, content_score, hook_subscore, topic_subscore, retention_subscore, cta_subscore, conversion_subscore, provider)
    values (${id}, ${userId}, ${"hash_" + id}, ${an.topic}, ${an.category}, ${an.visualStyle}, ${an.durationSec}, ${an.hook}, ${an.hookScore}, ${JSON.stringify(an.hookReasons)}, ${an.hasText}, ${an.hasFace}, ${an.hasSpeech}, ${an.language}, ${an.tone}, ${an.structure}, ${an.cta}, ${an.audience}, ${an.pace}, ${an.infoDensity}, ${an.contentScore}, ${an.hookSubscore}, ${an.topicSubscore}, ${an.retentionSubscore}, ${an.ctaSubscore}, ${an.conversionSubscore}, 'local_engine')`;
  return { id };
}

async function sqlAudit(userId: string, action: string, detail: string) {
  const sql = await getSql();
  await sql`insert into audit_logs (id, user_id, actor, action, detail) values (${nid("log")}, ${userId}, 'admin', ${action}, ${detail})`;
}

export const previewAssign = createServerFn({ method: "POST" })
  .validator((input: { videoIds: string[]; accountIds: string[] }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const accounts = (await loadAccounts(context.userId)).filter((a) => data.accountIds.includes(a.id));
    const videos = await sql<{ id: string; title: string; duration_sec: number }>`select id, title, duration_sec from videos where user_id = ${context.userId}`;
    const profilesRows = await sql<Record<string, unknown>>`select * from account_ai_profiles where user_id = ${context.userId}`;
    const profiles = profilesRows.map(mapProfile);
    const slots: Array<{
      accountId: string;
      handle: string;
      videoId: string;
      title: string;
      scheduledAt: string;
      hour: number;
      confidence: number;
    }> = [];
    const now = Date.now();
    for (const acc of accounts) {
      const prof = profiles.find((p) => p.accountId === acc.id);
      let offset = 0;
      for (const vid of videos.filter((v) => data.videoIds.includes(v.id))) {
        const when = new Date(now + offset * acc.intervalHours * 3600000);
        when.setUTCMinutes(0, 0, 0);
        const hour = prof?.bestHours[offset % Math.max(prof.bestHours.length, 1)] ?? 19;
        when.setUTCHours(hour);
        slots.push({
          accountId: acc.id,
          handle: acc.handle,
          videoId: vid.id,
          title: vid.title,
          scheduledAt: when.toISOString(),
          hour,
          confidence: prof?.confidence ?? 18,
        });
        offset += 1;
      }
    }
    return { slots };
  });

export const upsertNetwork = createServerFn({ method: "POST" })
  .validator(
    (input: { name: string; region: string; proxyKind: string; proxyHost: string }) => input,
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const kind = data.proxyKind === "free" || data.proxyKind === "datacenter" ? data.proxyKind : "none";
    const warning =
      kind === "free"
        ? "Free proxy may be unstable or insecure. Не использовать для обхода ограничений Instagram, CAPTCHA или 2FA."
        : kind === "none"
          ? null
          : "Легитимная маршрутизация. Не обход блокировок платформы.";
    const status = kind === "free" ? "WARNING" : kind === "none" ? "HEALTHY" : "HEALTHY";
    const id = nid("net");
    await sql`insert into network_profiles (id, user_id, name, region, proxy_host, proxy_kind, status, latency_ms, last_check, warning)
      values (${id}, ${context.userId}, ${data.name.trim() || "Network"}, ${data.region || "Asia/Tashkent"}, ${data.proxyHost.trim()}, ${kind}, ${status}, ${kind === "none" ? 12 : null}, ${new Date().toISOString()}, ${warning})`;
    await sqlAudit(context.userId, "NETWORK_ADD", id);
    return { ok: true as const, id };
  });

export const probeNetwork = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const rows = await sql<{ proxy_kind: string; proxy_host: string }>`select proxy_kind, proxy_host from network_profiles where id = ${id} and user_id = ${context.userId}`;
    const row = rows[0];
    if (!row) return { ok: false as const, error: "not found" };
    const started = Date.now();
    let status = "HEALTHY";
    let warning: string | null = null;
    if (row.proxy_kind === "none" || !row.proxy_host) {
      status = "HEALTHY";
    } else if (row.proxy_kind === "free") {
      status = "WARNING";
      warning =
        "Free proxy may be unstable or insecure. Не считать это защитой от банов и не использовать для обхода ограничений.";
    } else {
      status = "HEALTHY";
      warning = "Профиль для легитимной маршрутизации. Не для обхода блокировок Instagram.";
    }
    if (row.proxy_host && row.proxy_kind !== "none") {
      try {
        const url = row.proxy_host.includes("://") ? row.proxy_host : `http://${row.proxy_host}`;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 2200);
        await fetch(url, { signal: ctrl.signal, method: "HEAD" }).catch(() => null);
        clearTimeout(t);
      } catch {
        status = row.proxy_kind === "free" ? "DISABLED" : "WARNING";
        warning = (warning ?? "") + " Хост не ответил в таймаут.";
      }
    }
    const latency = Date.now() - started;
    await sql`update network_profiles set status = ${status}, latency_ms = ${latency}, last_check = ${new Date().toISOString()}, warning = ${warning} where id = ${id} and user_id = ${context.userId}`;
    return { ok: true as const, status, latencyMs: latency, warning };
  });

export const setAccountNetwork = createServerFn({ method: "POST" })
  .validator((input: { accountId: string; networkId: string | null }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`update ig_accounts set network_profile_id = ${data.networkId} where id = ${data.accountId} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const acc = await sql<{ id: string; handle: string }>`select id, handle from ig_accounts where id = ${data.id} and user_id = ${context.userId}`;
    if (!acc[0]) return { ok: false as const, error: "not found" };
    await sql`delete from publication_tasks where account_id = ${data.id} and user_id = ${context.userId}`;
    await sql`delete from video_analytics where account_id = ${data.id} and user_id = ${context.userId}`;
    await sql`delete from experiments where account_id = ${data.id} and user_id = ${context.userId}`;
    await sql`delete from account_ai_profiles where account_id = ${data.id} and user_id = ${context.userId}`;
    await sql`delete from ai_recommendations where account_id = ${data.id} and user_id = ${context.userId}`;
    await sql`delete from ig_accounts where id = ${data.id} and user_id = ${context.userId}`;
    await sql`insert into audit_logs (id, user_id, actor, action, target, detail) values (${nid("log")}, ${context.userId}, 'admin', 'DELETE_ACCOUNT', ${data.id}, ${acc[0].handle})`;
    return { ok: true as const };
  });

export const connectMetaAccount = createServerFn({ method: "POST" })
  .validator((input: { id: string; igBusinessId: string; accessToken: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const token = data.accessToken.trim();
    const ig = data.igBusinessId.trim();
    if (!token || !ig) return { ok: false as const, error: "Нужны IG Business ID и токен Graph API" };
    await sql`update ig_accounts set meta_access_token = ${token}, ig_business_id = ${ig}, meta_connected = true where id = ${data.id} and user_id = ${context.userId}`;
    await sql`insert into audit_logs (id, user_id, actor, action, target, detail) values (${nid("log")}, ${context.userId}, 'admin', 'META_CONNECT', ${data.id}, ${"ig=" + ig})`;
    return { ok: true as const, hint: maskSecret(token) };
  });

export const saveIntegrations = createServerFn({ method: "POST" })
  .validator(
    (input: {
      telegramBotToken?: string;
      telegramChatId?: string;
      geminiApiKey?: string;
      metaAppId?: string;
      metaAppSecret?: string;
    }) => input,
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`insert into user_integrations (user_id) values (${context.userId}) on conflict (user_id) do nothing`;
    const cur = await sql<{
      telegram_bot_token: string;
      telegram_chat_id: string;
      gemini_api_key: string;
      meta_app_id: string;
      meta_app_secret: string;
    }>`select telegram_bot_token, telegram_chat_id, gemini_api_key, meta_app_id, meta_app_secret from user_integrations where user_id = ${context.userId}`;
    const keep = (next: string | undefined, prev: string, flag = "KEEP") =>
      next && next !== flag ? next.trim() : prev;
    const bot = keep(data.telegramBotToken, cur[0]?.telegram_bot_token ?? "");
    const chat = data.telegramChatId !== undefined ? data.telegramChatId.trim() : (cur[0]?.telegram_chat_id ?? "");
    const gem = keep(data.geminiApiKey, cur[0]?.gemini_api_key ?? "");
    const appId = data.metaAppId !== undefined ? data.metaAppId.trim() : (cur[0]?.meta_app_id ?? "");
    const appSecret = keep(data.metaAppSecret, cur[0]?.meta_app_secret ?? "");
    await sql`update user_integrations set telegram_bot_token = ${bot}, telegram_chat_id = ${chat}, gemini_api_key = ${gem}, meta_app_id = ${appId}, meta_app_secret = ${appSecret}, updated_at = ${new Date().toISOString()} where user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const testTelegram = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ telegram_bot_token: string; telegram_chat_id: string }>`select telegram_bot_token, telegram_chat_id from user_integrations where user_id = ${context.userId}`;
    const tok = rows[0]?.telegram_bot_token?.trim();
    const chat = rows[0]?.telegram_chat_id?.trim();
    if (!tok || !chat) return { ok: false as const, error: "Сначала сохрани токен бота и chat id / @channel" };
    return sendTelegram(tok, chat, "PULSE: тест алерта. Если видишь это — канал подключён.");
  });

export const generateCopy = createServerFn({ method: "POST" })
  .validator((input: { title: string; niche: string; handle: string; durationSec?: number }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ gemini_api_key: string }>`select gemini_api_key from user_integrations where user_id = ${context.userId}`;
    const key = rows[0]?.gemini_api_key?.trim() ?? "";
    if (!key) return localCasinoCopy(data);
    return geminiCopy({ apiKey: key, ...data });
  });

export const startMetaConnect = createServerFn({ method: "POST" })
  .validator((input: { accountId: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const acc = await sql<{ id: string }>`select id from ig_accounts where id = ${data.accountId} and user_id = ${context.userId}`;
    if (!acc[0]) return { ok: false as const, error: "Аккаунт не найден" };
    const integ = await sql<{ meta_app_id: string; meta_app_secret: string }>`select meta_app_id, meta_app_secret from user_integrations where user_id = ${context.userId}`;
    const appId = integ[0]?.meta_app_id?.trim() ?? "";
    const secret = integ[0]?.meta_app_secret?.trim() ?? "";
    if (!appId || !secret) {
      return {
        ok: false as const,
        error: "Сначала один раз сохрани Facebook App ID и App Secret в Настройках. Это не токен аккаунта — это твоё приложение, через которое Instagram даёт доступ.",
      };
    }
    const base = (process.env.BETTER_AUTH_URL || "").replace(/\/+$/, "");
    if (!base) return { ok: false as const, error: "Нет публичного URL сервера (BETTER_AUTH_URL)" };
    const redirectUri = `${base}/api/meta/callback`;
    const state = Buffer.from(JSON.stringify({ a: data.accountId, u: context.userId, t: Date.now() })).toString(
      "base64url",
    );
    return { ok: true as const, url: oauthDialogUrl({ appId, redirectUri, state }), redirectUri };
  });

export { confidenceFromSample, rate };

