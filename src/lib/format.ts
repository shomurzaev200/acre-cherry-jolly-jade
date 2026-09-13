export function formatCompact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "N/A";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return Math.round(n).toLocaleString("ru-RU");
}

export function formatPct(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return "N/A";
  return `${(n * 100).toFixed(digits)}%`;
}

export function formatInt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "N/A";
  return Math.round(n).toLocaleString("ru-RU");
}

export function formatRange(lo: number | null | undefined, hi: number | null | undefined): string {
  if (lo == null || hi == null) return "N/A";
  return `${formatCompact(lo)}–${formatCompact(hi)}`;
}

export function hourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export function sourceLabel(source: string): string {
  if (source === "official_api") return "Meta Graph API";
  if (source === "demo_workspace") return "Демо-набор";
  return source;
}
