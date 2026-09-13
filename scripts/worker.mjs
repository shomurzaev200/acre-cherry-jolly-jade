/**
 * Lightweight VPS worker: keep-alive + scheduler hint.
 * Publication itself only proceeds through the official Meta Graph API
 * when credentials exist; this process never fabricates views.
 */
const APP_URL = process.env.APP_URL || "http://127.0.0.1:8080";
const intervalMs = Number(process.env.WORKER_INTERVAL_MS || 30000);

async function tick() {
  try {
    const health = await fetch(`${APP_URL}/api/health`);
    const ready = await fetch(`${APP_URL}/api/ready`);
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        health: health.status,
        ready: ready.status,
      }),
    );
  } catch (err) {
    console.error("worker_error", err);
  }
}

console.log("pulse worker started", { APP_URL, intervalMs });
await tick();
setInterval(tick, intervalMs);
