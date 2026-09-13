#!/usr/bin/env node
/** Print http://PUBLIC_IP or nothing. Node 22 has fetch; image has no curl. */

async function tryFetch(url, opts = {}) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 2500);
  try {
    const res = await fetch(url, { ...opts, signal: c.signal });
    if (!res.ok) return "";
    return (await res.text()).trim();
  } catch {
    return "";
  } finally {
    clearTimeout(t);
  }
}

const token = await tryFetch("http://169.254.169.254/latest/api/token", {
  method: "PUT",
  headers: { "X-aws-ec2-metadata-token-ttl-seconds": "60" },
});
let ip = "";
if (token) {
  ip = await tryFetch("http://169.254.169.254/latest/meta-data/public-ipv4", {
    headers: { "X-aws-ec2-metadata-token": token },
  });
}
if (!ip) ip = await tryFetch("https://ifconfig.me");
if (!ip) ip = await tryFetch("https://api.ipify.org");
ip = ip.replace(/[^0-9.]/g, "");
if (ip) process.stdout.write(`http://${ip}`);
