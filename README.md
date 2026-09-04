# 레이아웃 도면 인덱스

고객 상담용 현장 레이아웃·도면 뷰어. GitHub Pages로 배포되는 정적 페이지.

## 보는 곳

https://jeongdeahyeon.github.io/design-index/

비밀번호: `9999` (화면 가림용 — 저장소가 public이라 완전한 보안은 아님)

## 구조

| 파일 | 역할 |
|---|---|
| `index.html` | 뷰어 (수정할 일 거의 없음) |
| `projects.json` | **현장 데이터 — 여기를 고침** |
| `images/` | 도면·렌더 이미지 파일 |

## 현장 추가하기

1. `projects.json` 을 GitHub 웹에서 열고 연필(✏️) 아이콘 클릭
2. `projects` 배열에 객체 하나 추가 (기존 항목 복사해서 수정하면 쉬움)
3. `status` 는 `est`(견적) / `plan`(계획) / `build`(시공중) / `done`(완료)
4. `images[].src` 규칙:
   - `""` → 회색 자리표시 (카테고리명만 표시)
   - `"plan:threeRoom"` 또는 `"plan:openLdk"` → 내장 스케치 평면
   - `"images/마포자이_거실.jpg"` → images 폴더에 올린 실제 파일
   - `"https://..."` → 외부 이미지 링크
5. Commit changes

## 이미지 올리기

1. `images` 폴더로 이동 → **Add file → Upload files**
2. 파일 드래그 (웹용으로 압축한 JPG 권장, 긴 변 2000px 정도)
3. Commit
4. `projects.json` 의 해당 `src` 를 `"images/올린파일명.jpg"` 로 수정

## 비밀번호 바꾸기

`projects.json` 첫 부분 `"gate": "9999"` 값을 수정.

## 비공개로 바꾸고 싶어지면

저장소를 private 으로 돌리고 Cloudflare Pages + Access 로 이전. (별도 안내 필요)
