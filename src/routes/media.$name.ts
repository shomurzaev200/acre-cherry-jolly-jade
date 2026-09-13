import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { createFileRoute } from "@tanstack/react-router";

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "data/uploads");

export const Route = createFileRoute("/media/$name")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const name = params.name;
        if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
          return new Response("bad name", { status: 400 });
        }
        const file = join(UPLOAD_DIR, name);
        try {
          const st = await stat(file);
          if (!st.isFile()) return new Response("not found", { status: 404 });
          const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
          const type = name.endsWith(".webm") ? "video/webm" : name.endsWith(".mov") ? "video/quicktime" : "video/mp4";
          return new Response(stream, {
            headers: {
              "content-type": type,
              "content-length": String(st.size),
              "cache-control": "public, max-age=3600",
            },
          });
        } catch {
          return new Response("not found", { status: 404 });
        }
      },
    },
  },
});
