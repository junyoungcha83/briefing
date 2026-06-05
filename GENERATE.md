# 브리핑 생성 절차 (매일 06:00 KST · 예약 Claude 에이전트가 따름)

이 문서는 **하루치 브리핑(부동산 4건 + 경제 6건)** 을 수집·번역·정리해 `data/feed.json` 에 게시하는 절차다.
유료 API 없이 **WebSearch / WebFetch + Write/Bash** 만 사용한다(기존 `realestate-briefing` 스킬과 동일 제약).
**텔레그램으로 보내지 않는다.** 앱(GitHub Pages)에만 게시한다.

## 0. 작업 디렉토리·날짜

```bash
cd ~/Documents/github/briefing
TZ=Asia/Seoul date +%Y-%m-%d      # → ${TODAY}
```

## 1. 부동산 4건 — 우리나라 부동산 뉴스 (최근 24시간)

- WebSearch 로 한국 주요 언론사 기사 확보. 검색어 예: `부동산 정책 오늘`, `서울 아파트 시세`,
  `주택담보대출 금리`, `청약 분양`, `재건축 재개발`, `전세 시장`.
- 신뢰 매체 우선: 연합뉴스, KBS·MBC·SBS 경제, 매일경제, 한국경제, 조선비즈, 머니투데이.
- 참고: `~/.claude/skills/realestate-briefing/references/data-sources.md` (출처·원칙 재사용).
- 각 기사: 사실 위주, 출처·URL 확보. 24시간 이내 발행 우선.

## 2. 경제 6건 — 가상자산 · 주식/기업 · 정책 · 분석 (최근 24시간, 미국 중심)

- WebSearch 로 **미국 주요 언론사**: Reuters, Bloomberg, CNBC, WSJ, AP, Financial Times.
- **미 금융당국·의회 원자료** 적극 활용:
  - 연준(Fed): https://www.federalreserve.gov/newsevents.htm (FOMC·연설·성명)
  - SEC: https://www.sec.gov/news/pressreleases
  - 재무부(Treasury): https://home.treasury.gov/news/press-releases
  - 미 의회: https://www.congress.gov (법안·청문회)
- 범위 골고루: 가상자산(crypto) · 주식/기업(실적·M&A·빅테크) · 정책(금리·규제·입법) · 분석/해설 기사.
- 검색어 예: `Fed interest rate decision`, `SEC crypto ETF`, `US stock market today`,
  `Congress financial regulation bill`, `Bitcoin Ethereum news`, `Nvidia earnings`.

## 3. 각 기사 필드 작성

JSON item 한 개당:

| 필드 | 내용 |
|---|---|
| `category` | `"realestate"` 또는 `"economy"` |
| `headline` | **한글** 헤드라인 (간결, 핵심) |
| `preview` | **한글** 미리보기 4줄 분량(약 3~4문장). 핵심 사실 요약 |
| `body` | **한글** 전체 정리 본문. 경제(영어 기사)는 **번역**하되 **중요 용어는 영어 병기** — 예: 기준금리(policy rate)·양적긴축(QT)·연방공개시장위원회(FOMC)·상장지수펀드(ETF)·현물(spot). 문단은 빈 줄(`\n\n`)로 구분 |
| `source` | 매체/기관명 (예: `Reuters`, `연합뉴스`, `Fed`) |
| `source_url` | 원문 URL (필수, 가능한 한 정확히) |
| `lang_original` | 경제=`"en"`, 부동산=`"ko"` |

작성 원칙(중요):
- **추측·예측·환각 금지.** 보도된 사실과 발표 수치만. 의견·전망 작성 금지.
- 숫자는 천단위 콤마. 출처를 분명히.
- 24시간 내 적절한 기사를 못 찾으면 **건수를 줄이고** 그대로 둔다(억지로 채우지 말 것).

## 4. 게시 — feed.json 병합 + 커밋

오늘 items 를 임시 파일로 작성한 뒤 머지 스크립트 실행:

```bash
# data/_today.json 작성 (Write 도구): { "date": "${TODAY}", "items": [ ...10건... ] }
node scripts/build-feed.mjs data/_today.json
rm -f data/_today.json
git add -A
git commit -m "briefing: ${TODAY}"
git push
```

- `build-feed.mjs` 가 자동으로: 최신순 prepend → `source_url` 중복 제거 → 전체 영구 보존 →
  `data/feed.json` 저장 + `data/archive/${TODAY}.json` 기록 + 기존 **샘플 데이터 제거**.
- push 후 GitHub Pages 가 1~2분 내 자동 배포. 앱은 다음 열람 시 최신을 가져온다.

## 5. 마무리 보고 (예약 실행 로그)

- 게시 건수(부동산/경제), 빠진 항목 사유(있으면) 한 줄 요약.
