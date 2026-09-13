import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/kpi";
import { VideoThumb } from "@/components/thumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCompact } from "@/lib/format";
import { getVideoDetail, grokExplain } from "@/lib/server/workspace";

export const Route = createFileRoute("/_app/content/$id")({ component: VideoPage });

function VideoPage() {
  const { id } = Route.useParams();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getVideoDetail>>>(null);
  const [tab, setTab] = useState("Preview");
  const [ai, setAi] = useState<string | null>(null);

  useEffect(() => {
    void getVideoDetail({ data: id }).then(setDetail);
  }, [id]);

  if (!detail) return <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-bg-subtle" />;
  const v = detail.video;
  const an = detail.analysis;
  const top = detail.scored[0];

  return (
    <div className="space-y-6">
      <PageHeader kicker="Video" title={v.title} />
      <div className="flex gap-1 overflow-x-auto">
        {["Preview", "Publication", "Analytics", "AI Analysis", "Recommendations", "History"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`h-9 shrink-0 rounded-full px-3 text-xs ${tab === t ? "bg-bg-subtle" : "text-fg-muted"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Preview" ? (
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <VideoThumb seed={v.thumbnailSeed} title={v.title} className="aspect-[4/5] rounded-[var(--radius-lg)]" />
          <div className="panel p-5 text-sm">
            <p>{v.topic} · {v.hookStyle} · {v.durationSec}s · cluster {v.topicCluster}</p>
            <p className="mt-2 text-fg-muted">Original сохранён как metadata. FFmpeg-обработка — на VPS worker, не в браузере.</p>
          </div>
        </div>
      ) : null}

      {tab === "Publication" ? (
        <ul className="space-y-2">
          {detail.tasks.map((t) => (
            <li key={t.id} className="panel p-4 text-sm">
              <p className="font-medium">{t.status} · {new Date(t.scheduledAt).toLocaleString("ru-RU")}</p>
              <p className="mt-1 whitespace-pre-wrap text-fg-muted">{t.caption}</p>
              <p className="mt-1 text-xs text-fg-subtle">{t.hashtags}</p>
              <p className="mt-2 text-xs">
                Forecast: {t.predictedViewsLo ?? "N/A"}–{t.predictedViewsHi ?? "N/A"} views · conf {t.predictionConfidence ?? "N/A"}%
                <span className="text-fg-subtle"> · прогноз, не гарантия</span>
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "Analytics" ? (
        <div className="space-y-4">
          {detail.velocity.length ? (
            <div className="panel p-5">
              <p className="text-[11px] uppercase tracking-widest text-fg-subtle">Velocity</p>
              <ul className="mt-3 space-y-1 font-mono text-sm tabular">
                {detail.velocity.map((x) => (
                  <li key={x.window} className="flex justify-between">
                    <span>{x.window}</span>
                    <span>{formatCompact(x.views)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="panel p-5">
            <p className="text-sm">
              Views {formatCompact(top?.views)} · Reach {formatCompact(top?.reach)} · Profile {formatCompact(top?.profileVisits)} · Link {formatCompact(top?.linkClicks)}
            </p>
            <p className="mt-2 text-xs text-fg-subtle">Источник: {top?.source === "official_api" ? "Meta Graph API" : "демо-набор"} · outlier {top?.outlier}</p>
          </div>
        </div>
      ) : null}

      {tab === "AI Analysis" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="panel p-5">
            <p className="text-[11px] uppercase tracking-widest text-fg-subtle">Content score</p>
            <p className="mt-2 font-mono text-4xl tabular">{an?.contentScore ?? "N/A"}</p>
            <ul className="mt-4 space-y-1 text-sm text-fg-muted">
              <li>Hook {an?.hookSubscore} · {an?.hook}</li>
              <li>Topic {an?.topicSubscore} · {an?.topic}</li>
              <li>Retention potential {an?.retentionSubscore}</li>
              <li>CTA {an?.ctaSubscore}</li>
              <li>Profile conversion {an?.conversionSubscore}</li>
            </ul>
            <p className="mt-3 text-xs">Hook score {an?.hookScore}/100</p>
            <ul className="mt-1 text-xs text-fg-muted">
              {an?.hookReasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <div className="panel p-5 text-sm space-y-1">
            <p>Style: {an?.visualStyle}</p>
            <p>Tone: {an?.tone} · Pace: {an?.pace} · Density: {an?.infoDensity}</p>
            <p>Face {an?.hasFace ? "yes" : "no"} · Speech {an?.hasSpeech ? "yes" : "no"} · Text {an?.hasText ? "yes" : "no"}</p>
            <p>CTA: {an?.cta}</p>
            <p className="text-xs text-fg-subtle">hash {an?.analysisHash} · provider {an?.provider}</p>
          </div>
        </div>
      ) : null}

      {tab === "Recommendations" ? (
        <div className="panel p-5">
          <p className="text-[11px] uppercase tracking-widest text-fg-subtle">Why this video performed</p>
          <p className="mt-1 text-xs text-fg-muted">Корреляция по истории аккаунта, не causation 100%.</p>
          <ul className="mt-4 space-y-2">
            {detail.why.map((f) => (
              <li key={f.key} className="grid grid-cols-[100px_1fr_40px] items-center gap-2 text-sm">
                <span>{f.key}</span>
                <span className="h-2 rounded-full bg-bg-subtle">
                  <span className="block h-2 rounded-full bg-teal/70" style={{ width: `${Math.round(f.level * 100)}%` }} />
                </span>
                <span className="font-mono text-xs">{"+".repeat(1 + Math.round(f.level * 2))}</span>
              </li>
            ))}
          </ul>
          <Button
            className="mt-4"
            variant="secondary"
            onClick={async () => {
              const res = await grokExplain({
                data: {
                  kind: "why",
                  payload: JSON.stringify({ video: v, analysis: an, scored: top }),
                },
              });
              setAi(res.ok ? res.text : res.error);
            }}
          >
            Объяснить через Grok
          </Button>
          {ai ? <p className="mt-3 whitespace-pre-wrap text-sm text-fg-muted">{ai}</p> : null}
        </div>
      ) : null}

      {tab === "History" ? (
        <ul className="space-y-2 text-sm">
          {detail.tasks.map((t) => (
            <li key={t.id} className="panel px-4 py-3">
              {t.status} · attempts {t.attemptCount} · {t.error ?? "ok"}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
