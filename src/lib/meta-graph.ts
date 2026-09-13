/** Official Instagram Graph API only. No passwords, no unofficial clients. */

const GRAPH = "https://graph.facebook.com/v21.0";
const SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
].join(",");

export function oauthDialogUrl(opts: { appId: string; redirectUri: string; state: string }) {
  const u = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  u.searchParams.set("client_id", opts.appId);
  u.searchParams.set("redirect_uri", opts.redirectUri);
  u.searchParams.set("scope", SCOPES);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", opts.state);
  return u.toString();
}

async function graph<T>(path: string, params: Record<string, string>, method: "GET" | "POST" = "GET"): Promise<T> {
  const u = new URL(path.startsWith("http") ? path : `${GRAPH}/${path.replace(/^\//, "")}`);
  if (method === "GET") {
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    const res = await fetch(u);
    return parse<T>(res);
  }
  const body = new URLSearchParams(params);
  const res = await fetch(u, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return parse<T>(res);
}

async function parse<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok || body.error) {
    throw new Error(body.error?.message || `Graph HTTP ${res.status}`);
  }
  return body;
}

export async function exchangeCode(opts: {
  appId: string;
  appSecret: string;
  redirectUri: string;
  code: string;
}) {
  const short = await graph<{ access_token: string }>("oauth/access_token", {
    client_id: opts.appId,
    client_secret: opts.appSecret,
    redirect_uri: opts.redirectUri,
    code: opts.code,
  });
  try {
    const longLived = await graph<{ access_token: string }>("oauth/access_token", {
      grant_type: "fb_exchange_token",
      client_id: opts.appId,
      client_secret: opts.appSecret,
      fb_exchange_token: short.access_token,
    });
    return longLived.access_token;
  } catch {
    return short.access_token;
  }
}

export async function findIgBusiness(userToken: string) {
  const pages = await graph<{
    data?: { id: string; name: string; access_token: string; instagram_business_account?: { id: string } }[];
  }>("me/accounts", {
    access_token: userToken,
    fields: "id,name,access_token,instagram_business_account",
  });
  const withIg = (pages.data ?? []).filter((p) => p.instagram_business_account?.id);
  if (!withIg[0]?.instagram_business_account?.id) {
    throw new Error(
      "У Facebook-страницы нет привязанного Instagram Business/Creator. В приложении Instagram: Настройки → Аккаунт → Тип — Professional, затем привяжи к Page.",
    );
  }
  const page = withIg[0];
  const igUserId = page.instagram_business_account?.id;
  if (!igUserId) {
    throw new Error(
      "У Facebook-страницы нет привязанного Instagram Business/Creator. В приложении Instagram: Настройки → Аккаунт → Тип — Professional, затем привяжи к Page.",
    );
  }
  return {
    pageName: page.name,
    pageToken: page.access_token,
    igUserId,
  };
}

export async function createReelContainer(opts: {
  igUserId: string;
  token: string;
  videoUrl: string;
  caption: string;
}) {
  return graph<{ id: string }>(
    `${opts.igUserId}/media`,
    {
      access_token: opts.token,
      media_type: "REELS",
      video_url: opts.videoUrl,
      caption: opts.caption,
      share_to_feed: "true",
    },
    "POST",
  );
}

export async function containerStatus(opts: { containerId: string; token: string }) {
  return graph<{ status_code?: string; status?: string }>(opts.containerId, {
    access_token: opts.token,
    fields: "status_code,status",
  });
}

export async function publishContainer(opts: { igUserId: string; token: string; containerId: string }) {
  return graph<{ id: string }>(
    `${opts.igUserId}/media_publish`,
    {
      access_token: opts.token,
      creation_id: opts.containerId,
    },
    "POST",
  );
}
