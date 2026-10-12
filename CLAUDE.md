# 레이아웃 도면 인덱스 — 작업 규칙 (Claude용)

상담 때 사장님·직원이 노트북/태블릿으로 보여주는 **내부용** 도면 뷰어. 고객에게 링크를 주지 않는다.

## 지금 실제로 쓰는 곳 (2026-10-12부터)
- 주소: https://design-index.eogus40301.workers.dev  (관리자 `/admin`), 비밀번호는 사장님·직원 공용(서버 비밀값).
- Cloudflare Worker + R2 비공개 저장소. 코드는 `worker/`. 사진·도면은 공개 주소가 없다.
- 예전 GitHub Pages 주소(jeongdeahyeon.github.io/design-index)는 더 이상 쓰지 않는다 — 고쳐도 사장님 화면에 안 나온다.

## 수정하는 법 — 반드시 마지막에 동기화
1. 지금처럼 `projects.json` / `images/` 를 고친다 (이미지 파일명은 ASCII만).
2. 커밋·푸시 (push 전에 `git fetch` + `git merge --ff-only origin/main`).
3. **`node worker/sync.mjs` 실행** (저장소 루트에서, 샌드박스 끄고). 새 사진만 R2에 올리고 projects.json을 서버에 반영한다.
   - "관리자 화면에서 바뀌었어요"라며 멈추면: `worker/.r2-admin-version.json` 을 열어 바뀐 점을 projects.json에 반영하고 다시 실행. 버려도 된다고 사용자가 확인했을 때만 `--force`.
4. 사용자에게 "새 주소에 반영됐다"고 알린다.

화면 코드(`worker/public/index.html`, `admin.html`)나 서버(`worker/src/index.js`)를 고쳤으면 `cd worker && npx wrangler@4.125.0 deploy` (샌드박스 끄고).
루트의 `index.html` / `admin.html` 은 예전 GitHub Pages용이라 고쳐도 새 주소에 안 나온다.

## 하지 말 것
- "엠제곱레이아웃인덱스"(m2gmg-cmd.github.io/layout-index)는 별개 — 건드리지 않는다.
- 비밀번호·토큰을 파일에 적지 않는다 (이 저장소는 공개 상태일 수 있다).
