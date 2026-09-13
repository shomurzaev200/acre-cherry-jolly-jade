import { useCallback, useEffect, useState } from "react";
import { getSnapshot } from "@/lib/server/workspace";
import type { WorkspaceSnapshot } from "@/lib/types";

export function useWorkspace() {
  const [data, setData] = useState<WorkspaceSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const snap = await getSnapshot();
      setData(snap);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка загрузки";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}
