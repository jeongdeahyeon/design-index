// 저장소(projects.json + images/)에서 고친 내용을 비공개 서버(R2)에 반영하는 스크립트.
//
//   사용:  cd Desktop/design-index  →  node worker/sync.mjs
//          (wrangler 로그인 필요 — 이 PC는 이미 되어 있음. 샌드박스 안에서 막히면 샌드박스 끄고 실행)
//
//   하는 일
//   1. 서버의 projects.json 이 지난 동기화 이후 바뀌었는지 확인
//      (새 관리자 화면 /admin 에서 누가 고쳤으면 덮어쓰지 않고 멈춤 → worker/.r2-admin-version.json 에 받아둠)
//      그래도 덮어쓰려면:  node worker/sync.mjs --force
//   2. projects.json 이 가리키는 사진·도면 중 아직 서버에 없는 것만 올림
//   3. projects.json 을 서버에 올림 (gate 같은 옛 공개용 필드는 뺌)
//
//   기록 파일 (이 PC에만, git 에 안 올라감): worker/.r2-last-sync.json, worker/.r2-uploaded.txt

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const W = path.dirname(fileURLToPath(import.meta.url));     // worker/
const ROOT = path.dirname(W);                                  // 저장소 루트
const BUCKET = "design-index-files";
const WRANGLER = ["--yes", "wrangler@4.125.0"];
const FORCE = process.argv.includes("--force");
const LAST = path.join(W, ".r2-last-sync.json");
const MANIFEST = path.join(W, ".r2-uploaded.txt");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

const norm = (s) => JSON.stringify(JSON.parse(s));
function wr(args, opts = {}) {
  return execFileSync(npx, [...WRANGLER, ...args], { cwd: W, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32", ...opts });
}
function wrAsync(args) {
  return new Promise((res) => {
    const p = spawn(npx, [...WRANGLER, ...args], { cwd: W, stdio: "ignore", shell: process.platform === "win32" });
    p.on("close", (code) => res(code === 0));
  });
}
const ctype = (f) => /\.pdf$/i.test(f) ? "application/pdf" : /\.png$/i.test(f) ? "image/png" : /\.webp$/i.test(f) ? "image/webp" : /\.gif$/i.test(f) ? "image/gif" : "image/jpeg";

// 1) 서버 쪽이 따로 바뀌었는지
let remote = "";
try { remote = wr(["r2", "object", "get", `${BUCKET}/data/projects.json`, "--pipe", "--remote"]); }
catch (e) { console.error("서버 데이터를 읽지 못했어요. wrangler 로그인/네트워크를 확인하세요.\n" + (e.stderr || e.message)); process.exit(1); }
if (fs.existsSync(LAST) && remote.trim()) {
  if (norm(remote) !== norm(fs.readFileSync(LAST, "utf8")) && !FORCE) {
    fs.writeFileSync(path.join(W, ".r2-admin-version.json"), remote);
    console.error("⚠ 서버의 현장 데이터가 지난 동기화 이후 관리자 화면에서 바뀌었어요. 덮어쓰지 않고 멈췄어요.\n" +
      "  서버 쪽 내용: worker/.r2-admin-version.json\n" +
      "  → 그 변경을 projects.json 에 반영한 뒤 다시 실행하거나, 버려도 되면 --force 로 실행하세요.");
    process.exit(2);
  }
}

// 2) 새 사진·도면 올리기
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "projects.json"), "utf8"));
delete data.gate;
const srcs = new Set();
(data.projects || []).forEach((p) => {
  if (p.cover && p.cover.src) srcs.add(p.cover.src);
  (p.alts || []).forEach((a) => (a.images || []).forEach((im) => im.src && srcs.add(im.src)));
  (p.photos || []).forEach((ph) => ph.src && srcs.add(ph.src));
});
const uploaded = new Set(fs.existsSync(MANIFEST) ? fs.readFileSync(MANIFEST, "utf8").split(/\r?\n/).filter(Boolean) : []);
const files = [...srcs].filter((s) => s.startsWith("images/")).map((s) => s.slice(7));
const missingLocal = files.filter((f) => !fs.existsSync(path.join(ROOT, "images", f)));
if (missingLocal.length) { console.error("⚠ projects.json 에 있는데 images/ 폴더에 없는 파일:\n  " + missingLocal.join("\n  ")); process.exit(3); }
const todo = files.filter((f) => !uploaded.has(f));
console.log(`사진·도면 ${files.length}개 중 새로 올릴 것 ${todo.length}개`);
let fail = [];
for (let i = 0; i < todo.length; i += 8) {
  const batch = todo.slice(i, i + 8);
  const ok = await Promise.all(batch.map(async (f) => {
    for (let t = 0; t < 3; t++) {
      if (await wrAsync(["r2", "object", "put", `${BUCKET}/images/${f}`, "--file", path.join(ROOT, "images", f), "--content-type", ctype(f), "--remote"])) return true;
    }
    return false;
  }));
  batch.forEach((f, k) => { if (ok[k]) { uploaded.add(f); fs.appendFileSync(MANIFEST, f + "\n"); } else fail.push(f); });
  process.stdout.write(`\r  ${Math.min(i + 8, todo.length)}/${todo.length}`);
}
if (todo.length) process.stdout.write("\n");
if (fail.length) { console.error("⚠ 올리지 못한 파일 (다시 실행하면 이어서 올려요):\n  " + fail.join("\n  ")); process.exit(4); }

// 3) 현장 데이터 올리기
const out = JSON.stringify(data, null, 2);
const tmp = path.join(W, ".r2-upload.json");
fs.writeFileSync(tmp, out);
wr(["r2", "object", "put", `${BUCKET}/data/projects.json`, "--file", tmp, "--content-type", "application/json", "--remote"]);
fs.renameSync(tmp, LAST);
console.log(`✓ 서버에 반영했어요 — 현장 ${data.projects.length}곳. https://design-index.eogus40301.workers.dev`);
