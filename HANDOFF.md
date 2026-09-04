# 프로젝트 인수인계 문서 (다른 AI에게 붙여넣기용)

이 문서를 다른 AI(ChatGPT, Gemini, Claude 등)에게 통째로 주면 이 프로젝트를 이어서 작업할 수 있습니다.
아래 "원본 파일" 섹션의 raw URL 3개도 함께 주거나, 파일 내용을 직접 붙여넣으세요.

---

## 1. 이게 뭔가

인테리어 회사가 **고객 상담할 때 보여주는 현장 레이아웃/도면 뷰어**.
릴스퀘어(lilsquare.com) 스타일 — 현장별로 도면안(ALT-A/B/C) 탭 + 카테고리(평면도/거실/주방…) + 이미지 뷰어.
홈페이지가 아니라 상담용 자료. GitHub Pages로 배포되는 **정적 사이트**(빌드 없음, 순수 HTML/CSS/JS 1파일씩).

- **저장소**: `github.com/jeongdeahyeon/design-index` (public)
- **뷰어(고객용)**: https://jeongdeahyeon.github.io/design-index/  · 비밀번호 `9999`
- **관리자(편집용)**: https://jeongdeahyeon.github.io/design-index/admin.html  · 비밀번호 `9999` + GitHub 토큰

## 2. 저장소 구조

| 파일 | 역할 | 수정 빈도 |
|---|---|---|
| `index.html` | 뷰어. 단일 HTML(인라인 CSS/JS). `projects.json`을 fetch해서 렌더 | 기능 바꿀 때만 |
| `admin.html` | 관리자. GitHub Contents API로 `projects.json`·이미지를 커밋 | 기능 바꿀 때만 |
| `projects.json` | **현장 데이터 (핵심)**. 뷰어/관리자가 공유 | 내용 바뀔 때마다 |
| `images/` | 도면·렌더 이미지 파일 (관리자가 업로드) | 이미지 추가 시 |
| `README.md` | 사용법 | |

빌드 도구·프레임워크·의존성 **없음**. 폰트만 Google Fonts(IBM Plex Sans KR / IBM Plex Mono) CDN.

## 3. 배포

`main` 브랜치에 push → GitHub Pages 자동 재빌드 → **1~2분 뒤** 반영.
관리자의 "저장" 버튼 = `PUT /repos/jeongdeahyeon/design-index/contents/projects.json` (main에 커밋) = push와 동일.
커밋 메시지 끝에 `Co-Authored-By: ...` 붙이는 컨벤션 사용 중(선택).

## 4. `projects.json` 스키마

```jsonc
{
  "studio": "스튜디오",          // 상단 좌측 이름
  "gate": "9999",                // 뷰어/관리자 비밀번호
  "_안내": "…",                  // 주석용, 무시됨
  "projects": [
    {
      "name": "노형E편한세상 (노형대림)",
      "type": "아파트",                    // 자유 문자열 (아파트/상가/사무실…)
      "status": "done",                    // est(견적) | plan(계획) | build(시공중) | done(완료)
      "meta": {                            // 도면정보 탭에 표로 표시. 키 자유. 현재 평형/위치/구조만 씀
        "평형": "공급 33.52py / 전용 25.54py",
        "위치": "서울 서초구 방배중앙로 30",
        "구조": "우측 대칭 · 발코니 확장"
      },
      "cad": "drive.google.com/…/…",       // 원본 CAD 링크(https:// 제외). 도면정보 탭에 링크로
      "note": "현관 팬트리 신설 요청 …",    // 도면정보 탭 하단 메모
      "cover": {                           // 선택. 도면정보 탭 상단에 크게 표시 + 도면정보 썸네일
        "src": "images/cover-xxxx.jpg",
        "caption": ""
      },
      "alts": [                            // 도면안들 (ALT-A, ALT-B…)
        {
          "code": "ALT-B",
          "title": "거실 확장형",
          "images": [
            {
              "cat": "평면도",              // 카테고리 (뷰어 하단 탭으로 필터). 자유 문자열
              "caption": "ALT-B 전체 평면",
              "src": "plan:threeRoom"       // src 규칙 아래 참고
            }
          ]
        }
      ]
    }
  ]
}
```

### `images[].src` / `cover.src` 값 규칙
- `""` (빈 문자열) → 회색 플레이스홀더 (카테고리명 표시)
- `"plan:threeRoom"` 또는 `"plan:openLdk"` → `index.html`에 내장된 SVG 스케치 평면
- `"images/파일명.jpg"` → 저장소 `images/` 폴더의 실제 파일 (상대경로)
- `"https://…"` → 외부 이미지 URL

## 5. 뷰어(index.html) 동작

- 로드 → 비밀번호 게이트(`sessionStorage`로 1회 통과 기억) → `fetch("projects.json")` → 렌더
- 좌측 사이드바: 검색창(이름·유형 필터) + 컴팩트 현장 목록. 모바일(≤860px)에선 숨김, 좌상단 ☰ 버튼으로 슬라이드 오버레이
- 현장 선택 시 **도면정보 탭이 기본**(`ai = -1`)
- 도면안 탭 선택 → 스테이지(큰 이미지) + 좌우 화살표 + 카운터 + 카테고리 탭 + 썸네일 필름스트립
- **스테이지는 고정 높이**(`height: min(66vh, 640px)`, 모바일 `min(52vh, 420px)`). 모든 이미지 `object-fit: contain`/`preserveAspectRatio`로 같은 크기 박스에 표시 — 앞으로 어떤 이미지 추가해도 동일 크기
- 키보드 ←→ 로 이미지 넘김, Esc로 사이드바 닫기
- 상태 색상: 회색=견적, 파랑=계획, 주황=시공중, 초록=완료
- 상태(state)는 전역 변수: `pi`(현장), `ai`(도면안, -1=도면정보), `cat`(카테고리 필터), `ii`(이미지 인덱스), `q`(검색어)

## 6. 관리자(admin.html) 동작

- 비밀번호 게이트 → GitHub **fine-grained PAT** 입력 (localStorage `design-index-gh-token`에 저장, GitHub 외부로 안 나감)
  - 토큰 요건: Repository access = design-index만, Permissions = **Contents: Read and write**
  - 연결 시 `repo.permissions.push` 확인해서 쓰기 권한 없으면 거부
- 편집 UI: 현장 목록(추가/삭제) + 폼(기본정보 / 속성 표 / 도면정보 도면 / 도면안·이미지)
- 이미지 업로드: 클라이언트에서 canvas로 **긴 변 2000px / JPEG q0.82 압축** → `PUT contents/images/<파일명>`
- **저장**: `projects.json`을 `sha` 대조하여 `PUT` (충돌 시 새로고침 안내)
- 헬퍼: `gh()`(헤더), `b64encodeUtf8`/`b64decodeUtf8`, `ghMsg()`(에러 메시지), `pickAndUpload(p, im, after)`

## 7. 규칙 / 함정 (중요)

1. **이미지 파일명은 반드시 ASCII.** 한글 파일명은 GitHub Pages에서 404 남 (NFC/NFD 문제). `admin.html`의 업로드 로직은 `img-<base36>.jpg` 형태로 강제.
2. `index.html`과 `admin.html`은 **의존성 없는 단일 파일**로 유지. 빌드 스텝 도입 금지 (GitHub Pages가 정적 서빙만 함).
3. 외부 리소스는 Google Fonts만. 다른 CDN·라이브러리 추가 지양.
4. **디자인 토큰**: `:root`의 CSS 변수(`--paper --sheet --stage --ink --graphite --line --blue …`), 라이트/다크 둘 다 정의됨. 색은 항상 변수로. 폰트: 본문 IBM Plex Sans KR, 라벨·수치·코드 IBM Plex Mono. 드래프팅(제도) 톤, 액센트는 architect blue.
5. 커밋 후 반영까지 1~2분. 뷰어는 새로고침 필요(캐시). 확인 시 `?v=날짜` 쿼리로 캐시 우회.
6. 저장소가 public이라 비밀번호 `9999`는 **눈속임 수준**(소스에 노출됨). 진짜 비공개 필요하면 private repo + Cloudflare Pages + Access로 이전.

## 8. 변경하는 법

- **데이터만** (현장/이미지 추가·수정): `projects.json` 편집 (+ 필요 시 `images/`에 ASCII 파일명으로 이미지 추가) → commit → push
- **기능/디자인**: `index.html` 또는 `admin.html` 편집 → commit → push
- 다른 AI에게 시킬 때: 수정된 파일 전체를 받아서 GitHub 웹 편집기에 붙여넣거나, 로컬 클론에서 push

## 9. 원본 파일 (raw URL)

- https://raw.githubusercontent.com/jeongdeahyeon/design-index/main/index.html
- https://raw.githubusercontent.com/jeongdeahyeon/design-index/main/admin.html
- https://raw.githubusercontent.com/jeongdeahyeon/design-index/main/projects.json

## 10. 미해결 / 다음 후보

- 실제 현장 렌더 이미지 채우기 (지금 대부분 플레이스홀더 / 내장 스케치)
- 이미지 여러 장 한 번에 업로드
- 커버 캡션 UI 노출 정리
- (원하면) 비공개 배포로 이전
