import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Funnel } from "@/components/funnel";
import { PageHeader } from "@/components/kpi";
import { formatCompact, formatPct } from "@/lib/format";
import { useWorkspace } from "@/lib/use-workspace";

export const Route = createFileRoute("/_app/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  const { data } = useWorkspace();
  const [sort, setSort] = useState<"views" | "profile" | "link" | "score">("views");
  const rows = useMemo(() => {
    const list = [...(data?.scored ?? [])];
    list.sort((a, b) => {
      if (sort === "profile") return (b.profileVisits ?? 0) - (a.profileVisits ?? 0);
      if (sort === "link") return (b.linkClicks ?? 0) - (a.linkClicks ?? 0);
      if (sort === "score") return (b.performanceScore ?? 0) - (a.performanceScore ?? 0);
      return (b.views ?? 0) - (a.views ?? 0);
    });
    return list;
  }, [data, sort]);
  if (!data) return <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-bg-subtle" />;

  return (
    <div className="space-y-6">
      <PageHeader kicker="Video comparison" title="Аналитика" />
      <Funnel data={data.funnel} />
      <div className="flex flex-wrap gap-2">
        {(["views", "profile", "link", "score"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSort(s)}
            className={`h-8 rounded-full px-3 text-xs ${sort === s ? "bg-bg-subtle" : "text-fg-muted"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-fg-subtle">
            <tr className="border-b border-line">
              <th className="px-4 py-2">Video</th>
              <th>Account</th>
              <th>Views</th>
              <th>Reach</th>
              <th>Profile</th>
              <th>Link</th>
              <th>Eng.</th>
              <th>AI score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.taskId + r.videoId} className="border-b border-line/50">
                <td className="px-4 py-2">
                  <Link to="/content/$id" params={{ id: r.videoId }} className="hover:text-teal">
                    {r.title}
                  </Link>
                </td>
                <td className="px-3 py-2">@{r.handle}</td>
                <td className="px-3 py-2 font-mono tabular">{formatCompact(r.views)}</td>
                <td className="px-3 py-2 font-mono tabular">{formatCompact(r.reach)}</td>
                <td className="px-3 py-2 font-mono tabular">{formatCompact(r.profileVisits)}</td>
                <td className="px-3 py-2 font-mono tabular">{formatCompact(r.linkClicks)}</td>
                <td className="px-3 py-2 font-mono tabular">{formatPct(r.profileRate)}</td>
                <td className="px-3 py-2 font-mono tabular">{r.performanceScore ?? "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
