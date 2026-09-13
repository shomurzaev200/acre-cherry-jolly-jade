import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/metrics")({
  server: {
    handlers: {
      GET: async () => {
        const lines = [
          "# HELP pulse_up 1 if process is up",
          "# TYPE pulse_up gauge",
          "pulse_up 1",
        ].join("\n");
        return new Response(lines + "\n", {
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});
