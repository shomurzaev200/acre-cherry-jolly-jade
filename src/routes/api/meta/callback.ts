import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { exchangeCode, findIgBusiness } from "@/lib/meta-graph";

export const Route = createFileRoute("/api/meta/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const err = url.searchParams.get("error_description") || url.searchParams.get("error");
        if (err) return redirect(`/accounts?meta_error=${encodeURIComponent(err)}`);
        const code = url.searchParams.get("code");
        const stateRaw = url.searchParams.get("state");
        if (!code || !stateRaw) return redirect("/accounts?meta_error=no_code");
        let accountId = "";
        let userId = "";
        try {
          const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8")) as {
            a?: string;
            u?: string;
          };
          accountId = state.a ?? "";
          userId = state.u ?? "";
        } catch {
          return redirect("/accounts?meta_error=bad_state");
        }
        const sql = await getSql();
        const integ = await sql<{ meta_app_id: string; meta_app_secret: string }>`
          select meta_app_id, meta_app_secret from user_integrations where user_id = ${userId}`;
        const appId = integ[0]?.meta_app_id?.trim() ?? "";
        const appSecret = integ[0]?.meta_app_secret?.trim() ?? "";
        const base = (process.env.BETTER_AUTH_URL || `${url.protocol}//${url.host}`).replace(/\/+$/, "");
        try {
          const token = await exchangeCode({
            appId,
            appSecret,
            redirectUri: `${base}/api/meta/callback`,
            code,
          });
          const ig = await findIgBusiness(token);
          await sql`update ig_accounts set meta_access_token = ${ig.pageToken}, ig_business_id = ${ig.igUserId}, meta_connected = true
            where id = ${accountId} and user_id = ${userId}`;
          return redirect(`/accounts?connected=${encodeURIComponent(ig.pageName)}`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "oauth_failed";
          return redirect(`/accounts?meta_error=${encodeURIComponent(msg)}`);
        }
      },
    },
  },
});

function redirect(to: string) {
  return new Response(null, { status: 302, headers: { Location: to } });
}
