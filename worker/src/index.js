// 레이아웃 도면 인덱스 — 비공개 서버 (Cloudflare Worker + R2)
//
//  · 사장님·직원: STAFF_PASSWORD 로 로그인 → 전체 현장 보기·편집 (쿠키 30일)
//  · 상담용 내부 도구 — 고객에게 주는 링크 없음 (고객용 공유는 dh_manager에서)
//  · 데이터: R2 "data/projects.json", 사진·도면: R2 "images/<파일명>"
//  · 사진·도면은 공개 주소가 없음. 모든 요청이 여기서 로그인·링크를 확인한 뒤에만 나감.

const DATA_KEY = "data/projects.json";
const COOKIE = "di_s";
const SESSION_DAYS = 30;
const MAX_UPLOAD = 30 * 1024 * 1024;
const enc = new TextEncoder();

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });

function b64url(buf) {
  let s = ""; const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
async function sha(s) { return b64url(await crypto.subtle.digest("SHA-256", enc.encode(s))); }
function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
function readCookie(req, name) {
  const c = req.headers.get("cookie") || "";
  const m = c.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : null;
}
async function isStaff(req, env) {
  if (!env.SESSION_SECRET) return false;
  const v = readCookie(req, COOKIE); if (!v) return false;
  const [exp, sig] = v.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return same(sig, await hmac(env.SESSION_SECRET, "staff." + exp));
}

async function loadProjects(env) {
  const obj = await env.FILES.get(DATA_KEY);
  if (!obj) return { data: { studio: "", projects: [] }, etag: null };
  return { data: JSON.parse(await obj.text()), etag: obj.etag };
}

async function serveFile(env, key, req) {
  const obj = await env.FILES.get(key, { range: req.headers, onlyIf: req.headers });
  if (!obj) return new Response("Not found", { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("etag", obj.httpEtag);
  h.set("cache-control", "private, max-age=86400");
  h.set("x-robots-tag", "noindex");
  if (!("body" in obj)) return new Response(null, { status: 304, headers: h });
  return new Response(obj.body, { status: req.headers.get("range") ? 206 : 200, headers: h });
}

const page = (env, req, path) => env.ASSETS.fetch(new Request(new URL(path, req.url), req));

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = decodeURIComponent(url.pathname);
    const m = req.method;

    /* ---- 로그인 ---- */
    if (path === "/api/login" && m === "POST") {
      let pw = "";
      try { pw = String((await req.json()).password || ""); } catch {}
      const ok = env.STAFF_PASSWORD && env.SESSION_SECRET && same(await sha(pw), await sha(env.STAFF_PASSWORD));
      if (!ok) { await new Promise((r) => setTimeout(r, 900)); return json({ ok: false, error: "비밀번호가 맞지 않습니다." }, 401); }
      const exp = Date.now() + SESSION_DAYS * 864e5;
      const v = exp + "." + (await hmac(env.SESSION_SECRET, "staff." + exp));
      return json({ ok: true }, 200, { "set-cookie": `${COOKIE}=${v}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax` });
    }
    if (path === "/api/logout" && m === "POST") {
      return json({ ok: true }, 200, { "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });
    }
    if (path === "/api/me") return json({ staff: await isStaff(req, env) });

    /* ---- 여기부터 사장님·직원 전용 ---- */
    if (path.startsWith("/api/") || path.startsWith("/images/")) {
      if (!(await isStaff(req, env))) return json({ ok: false, error: "login" }, 401);

      if (path.startsWith("/images/") && (m === "GET" || m === "HEAD")) {
        const key = path.slice(1);
        if (!/^images\/[A-Za-z0-9._-]+$/.test(key)) return new Response("Not found", { status: 404 });
        return serveFile(env, key, req);
      }
      if (path === "/api/projects" && m === "GET") {
        const { data, etag } = await loadProjects(env);
        return json(data, 200, etag ? { "x-version": etag } : {});
      }
      if (path === "/api/projects" && m === "PUT") {
        let data;
        try { data = JSON.parse(await req.text()); } catch { return json({ ok: false, error: "형식이 잘못됐어요" }, 400); }
        if (!data || !Array.isArray(data.projects)) return json({ ok: false, error: "형식이 잘못됐어요" }, 400);
        delete data.gate;
        const ifMatch = (req.headers.get("x-if-version") || req.headers.get("if-match") || "").replace(/^W\//, "").replace(/"/g, "");
        const opts = { httpMetadata: { contentType: "application/json; charset=utf-8" } };
        if (ifMatch) opts.onlyIf = { etagMatches: ifMatch };
        const put = await env.FILES.put(DATA_KEY, JSON.stringify(data, null, 2), opts);
        if (!put) return json({ ok: false, error: "conflict" }, 409);
        // 그날그날 백업 1개 (같은 날은 덮어씀)
        await env.FILES.put(`backup/projects-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data));
        return json({ ok: true, etag: put.etag });
      }
      if (path === "/api/upload" && m === "POST") {
        const key = url.searchParams.get("name") || "";
        if (!/^images\/[A-Za-z0-9._-]{3,120}$/.test(key)) return json({ ok: false, error: "파일 이름이 잘못됐어요" }, 400);
        const len = Number(req.headers.get("content-length") || 0);
        if (len > MAX_UPLOAD) return json({ ok: false, error: "파일이 너무 커요 (최대 30MB)" }, 413);
        const ct = req.headers.get("content-type") || (/\.pdf$/i.test(key) ? "application/pdf" : "image/jpeg");
        await env.FILES.put(key, req.body, { httpMetadata: { contentType: ct } });
        return json({ ok: true, src: key });
      }
      return json({ ok: false }, 404);
    }

    /* ---- 화면 파일 (index.html, admin.html) ---- */
    if (path === "/projects.json" || path.startsWith("/images")) return new Response("Not found", { status: 404 });
    const res = await page(env, req, url.pathname);
    const r = new Response(res.body, res);
    r.headers.set("x-robots-tag", "noindex");
    return r;
  }
};
