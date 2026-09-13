import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { getSql } from "@/lib/db";
import { analysisFor, DEMO_VIDEOS } from "@/lib/seed-data";
import { nid } from "@/lib/utils";

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "data/uploads");

export const Route = createFileRoute("/api/media")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        const userId = session?.user?.id;
        if (!userId) return json({ error: "Войди в панель" }, 401);
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) return json({ error: "Нет файла" }, 400);
        if (file.size > 95 * 1024 * 1024) return json({ error: "Максимум ~95 МБ" }, 400);
        const id = nid("vid");
        const ext = (extname(file.name) || ".mp4").toLowerCase();
        const safeExt = [".mp4", ".mov", ".webm", ".m4v"].includes(ext) ? ext : ".mp4";
        const fileName = `${id}${safeExt}`;
        await mkdir(UPLOAD_DIR, { recursive: true });
        const buf = Buffer.from(await file.arrayBuffer());
        await writeFile(join(UPLOAD_DIR, fileName), buf);
        const title = String(form.get("title") || file.name.replace(/\.[^.]+$/, ""));
        const durationSec = Number(form.get("durationSec") || 18) || 18;
        const topic = String(form.get("topic") || "casino slot");
        const hookStyle = String(form.get("hookStyle") || "Question");
        const cluster = String(form.get("cluster") || "A").slice(0, 1).toUpperCase();
        const sql = await getSql();
        await sql`insert into videos (id, user_id, title, duration_sec, topic, topic_cluster, hook_style, language, status, thumbnail_seed, original_name, file_size_kb, file_name)
          values (${id}, ${userId}, ${title}, ${durationSec}, ${topic}, ${cluster}, ${hookStyle}, 'ru', 'ready', ${"9"}, ${file.name}, ${Math.round(file.size / 1024)}, ${fileName})`;
        const fake = { id, title, durationSec, topic, topicCluster: cluster, hookStyle, seed: "9" };
        const an = analysisFor(fake as (typeof DEMO_VIDEOS)[number]);
        await sql`insert into ai_video_analysis (video_id, user_id, analysis_hash, topic, category, visual_style, duration_sec, hook, hook_score, hook_reasons, has_text, has_face, has_speech, language, tone, structure, cta, audience, pace, info_density, content_score, hook_subscore, topic_subscore, retention_subscore, cta_subscore, conversion_subscore, provider)
          values (${id}, ${userId}, ${"hash_" + id}, ${an.topic}, ${an.category}, ${an.visualStyle}, ${an.durationSec}, ${an.hook}, ${an.hookScore}, ${JSON.stringify(an.hookReasons)}, ${an.hasText}, ${an.hasFace}, ${an.hasSpeech}, ${an.language}, ${an.tone}, ${an.structure}, ${an.cta}, ${an.audience}, ${an.pace}, ${an.infoDensity}, ${an.contentScore}, ${an.hookSubscore}, ${an.topicSubscore}, ${an.retentionSubscore}, ${an.ctaSubscore}, ${an.conversionSubscore}, 'local_engine')`;
        return json({ ok: true, id, fileName });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
