# 브리핑 (briefing)

부동산·경제 뉴스를 매일 아침 자동으로 받아 **블로그형 PWA 앱**으로 보는 프로젝트.

- **부동산**(🚩 빨강 깃발): 우리나라 부동산 뉴스 — 한국 주요 언론사
- **경제**(🔵 파랑 깃발): 가상자산·주식/기업·정책·분석 — 미국 언론사 + 미 금융당국(Fed·SEC·재무부)·미 의회.
  영어 기사는 **한글 번역 + 중요 용어 영어 병기**, 맨 아래 원문 링크 제공.

## 구조

```
[예약 Claude 에이전트] 매일 06:00 KST — GENERATE.md 절차
   │ WebSearch/WebFetch 수집 → 한글 번역·정리 → items[]
   │ node scripts/build-feed.mjs → feed.json 병합 → git push
   ▼
[GitHub Pages] data/feed.json (정적)
   ▼
[PWA 앱] 깃발 + 헤드라인 + 4줄 미리보기 → 클릭 시 전체 본문 + 원문 링크
```

```
briefing/
├── index.html
├── assets/{app.js, app.css, icon.svg, icon-maskable.svg}
├── manifest.webmanifest
├── sw.js
├── data/
│   ├── feed.json            # 앱이 읽는 전체 누적 항목 (영구 보존, 생성기가 갱신)
│   └── archive/YYYY-MM-DD.json
├── scripts/build-feed.mjs   # 오늘 items → feed.json 병합(영구 누적)/아카이브
└── GENERATE.md              # 매일 생성 절차(예약 에이전트가 따름)
```

## 로컬 실행

```sh
python3 -m http.server 8030
open http://localhost:8030/
```

## 데이터 모델 (`data/feed.json`)

```json
{
  "version": 1,
  "updated_at": "ISO8601",
  "items": [
    { "id": "...", "date": "YYYY-MM-DD", "category": "realestate|economy",
      "headline": "...", "preview": "한글 4줄", "body": "한글 본문(용어 영어 병기)",
      "source": "매체명", "source_url": "https://...", "lang_original": "ko|en" }
  ]
}
```

## 매일 생성 (수동 1회 실행)

`GENERATE.md` 절차를 따라 부동산 4 · 경제 6건을 만들고:

```sh
node scripts/build-feed.mjs data/_today.json   # _today.json = { date, items[] }
git add -A && git commit -m "briefing: YYYY-MM-DD" && git push
```

## 자동화

`/schedule` 로 매일 06:00 Asia/Seoul 에 예약 Claude 에이전트 등록 — `GENERATE.md` 절차를 자동 수행.
유료 API 없이 Claude Code(WebSearch/WebFetch)로 동작. 텔레그램 발송은 하지 않음.
