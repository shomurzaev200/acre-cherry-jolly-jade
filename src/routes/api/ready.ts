import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";

export const Route = createFileRoute("/api/ready")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const sql = await getSql();
          await sql`select 1 as n`;
          return new Response(JSON.stringify({ ready: true }), {
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ ready: false, error: String(e) }), {
            status: 503,
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        }
      },
    },
  },
});
