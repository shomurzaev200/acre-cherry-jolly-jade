export type AccountStatus = "ACTIVE" | "PAUSED" | "ERROR";
export type AccountMode = "MANUAL" | "AUTOPILOT";
export type TaskStatus =
  | "draft"
  | "pending_approval"
  | "queued"
  | "publishing"
  | "published"
  | "failed"
  | "awaiting_official_api"
  | "retry";
export type DataSource = "official_api" | "demo_workspace";
export type NetworkStatus = "HEALTHY" | "WARNING" | "OFFLINE" | "DISABLED";

export type IgAccount = {
  id: string;
  handle: string;
  displayName: string;
  niche: string;
  language: string;
  status: AccountStatus;
  mode: AccountMode;
  requireApproval: boolean;
  intervalHours: number;
  timezone: string;
  networkProfileId: string | null;
  followers: number;
  bio: string;
  profileLink: string;
  metaConnected: boolean;
  metaTokenHint: string | null;
  igBusinessId: string | null;
};

export type NetworkProfile = {
  id: string;
  name: string;
  region: string;
  proxyHost: string;
  proxyKind: string;
  status: NetworkStatus;
  latencyMs: number | null;
  lastCheck: string | null;
  warning: string | null;
};

export type Video = {
  id: string;
  title: string;
  durationSec: number;
  topic: string;
  topicCluster: string;
  hookStyle: string;
  language: string;
  status: string;
  thumbnailSeed: string;
  originalName: string;
};

export type VideoAnalysis = {
  videoId: string;
  analysisHash: string;
  topic: string;
  category: string;
  visualStyle: string;
  durationSec: number | null;
  hook: string;
  hookScore: number | null;
  hookReasons: string[];
  hasText: boolean | null;
  hasFace: boolean | null;
  hasSpeech: boolean | null;
  language: string;
  tone: string;
  structure: string;
  cta: string;
  audience: string;
  pace: string;
  infoDensity: string;
  contentScore: number | null;
  hookSubscore: number | null;
  topicSubscore: number | null;
  retentionSubscore: number | null;
  ctaSubscore: number | null;
  conversionSubscore: number | null;
  provider: string;
};

export type PublicationTask = {
  id: string;
  accountId: string;
  videoId: string;
  scheduledAt: string;
  status: TaskStatus;
  caption: string;
  hashtags: string;
  cta: string;
  hashtagCluster: string;
  predictedViewsLo: number | null;
  predictedViewsHi: number | null;
  predictedProfileLo: number | null;
  predictedProfileHi: number | null;
  predictedClicksLo: number | null;
  predictedClicksHi: number | null;
  predictionConfidence: number | null;
  attemptCount: number;
  error: string | null;
  idempotencyKey: string;
  publishedAt: string | null;
};

export type VideoAnalytic = {
  id: string;
  taskId: string | null;
  accountId: string;
  videoId: string;
  hoursAfter: number;
  views: number | null;
  reach: number | null;
  profileVisits: number | null;
  linkClicks: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  retention: number | null;
  source: DataSource;
};

export type AiProfile = {
  accountId: string;
  bestHours: number[];
  bestDays: string[];
  bestLengthMin: number | null;
  bestLengthMax: number | null;
  bestTopics: string[];
  bestHooks: string[];
  bestCta: string;
  bestHashtagCluster: string;
  bestCaptionStyle: string;
  profileVisitRate: number | null;
  linkClickRate: number | null;
  confidence: number;
  sampleSize: number;
  doMore: string[];
  doLess: string[];
  notes: string;
};

export type Experiment = {
  id: string;
  accountId: string;
  kind: string;
  name: string;
  variantA: string;
  variantB: string;
  holdConstant: string;
  status: string;
  winner: string | null;
  sampleA: number;
  sampleB: number;
  metricA: number | null;
  metricB: number | null;
  notes: string;
};

export type Recommendation = {
  id: string;
  accountId: string | null;
  recDate: string;
  body: string;
  reason: string;
  confidence: number;
  accepted: boolean | null;
  result: string | null;
};

export type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  accountId: string | null;
  videoId: string | null;
  read: boolean;
  createdAt: string;
};

export type ScoredRow = {
  accountId: string;
  videoId: string;
  taskId: string;
  handle: string;
  title: string;
  views: number | null;
  reach: number | null;
  profileVisits: number | null;
  linkClicks: number | null;
  profileRate: number | null;
  linkRate: number | null;
  performanceScore: number | null;
  outlier: "viral" | "under" | "normal" | "insufficient";
  source: DataSource;
};

export type FunnelTotals = {
  views: number | null;
  reach: number | null;
  profileVisits: number | null;
  linkClicks: number | null;
  source: DataSource | "mixed" | "none";
};

export type WorkspaceSnapshot = {
  pausedAll: boolean;
  role: string;
  demoSeeded: boolean;
  accounts: IgAccount[];
  networks: NetworkProfile[];
  videos: Video[];
  tasks: PublicationTask[];
  analytics: VideoAnalytic[];
  profiles: AiProfile[];
  experiments: Experiment[];
  recommendations: Recommendation[];
  notifications: NotificationRow[];
  scored: ScoredRow[];
  funnel: FunnelTotals;
  todayPublished: number;
  queueDepth: number;
  errors: number;
  viralAlerts: ScoredRow[];
  fatigue: { accountId: string; handle: string; topic: string; message: string }[];
  integrations: {
    telegramBotSet: boolean;
    telegramBotHint: string | null;
    telegramChatId: string;
    geminiSet: boolean;
    geminiHint: string | null;
  };
};
