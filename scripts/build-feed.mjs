#!/usr/bin/env node
// 오늘자 items 를 data/feed.json 에 병합한다.
//   node scripts/build-feed.mjs data/_today.json
// _today.json 형식: { "date": "YYYY-MM-DD", "items": [ {category,headline,preview,body,source,source_url,lang_original}, ... ] }
//
// 동작: 오늘 items 를 최신순 prepend → source_url(없으면 id) 기준 중복 제거 → 30일 초과분 트림
//       → data/feed.json 저장 + data/archive/<date>.json 기록. updated_at 갱신.

import fs from 'node:fs';
import path from 'node:path';

const KEEP_DAYS = 30;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const FEED = path.join(ROOT, 'data', 'feed.json');
const ARCHIVE_DIR = path.join(ROOT, 'data', 'archive');

const todayPath = process.argv[2];
if (!todayPath) { console.error('사용법: node scripts/build-feed.mjs <today.json>'); process.exit(1); }

const today = JSON.parse(fs.readFileSync(todayPath, 'utf8'));
const date = String(today.date || '').trim();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.error('today.json 의 date 가 YYYY-MM-DD 형식이 아님:', date); process.exit(1); }
const incoming = Array.isArray(today.items) ? today.items : [];
if (!incoming.length) { console.error('today.json 에 items 가 없음'); process.exit(1); }

// 정규화 + id 부여
let seq = 0;
const norm = incoming.map(it => {
  const category = it.category === 'economy' ? 'economy' : 'realestate';
  seq += 1;
  return {
    id: it.id || `${date}-${category === 'economy' ? 'econ' : 're'}-${seq}`,
    date,
    category,
    headline: String(it.headline || '').trim(),
    preview: String(it.preview || '').trim(),
    body: String(it.body || '').trim(),
    source: String(it.source || '').trim(),
    source_url: String(it.source_url || '').trim(),
    lang_original: it.lang_original || (category === 'economy' ? 'en' : 'ko'),
  };
}).filter(it => it.headline && it.body);

// 기존 feed 로드
let feed = { version: 1, items: [] };
try { feed = JSON.parse(fs.readFileSync(FEED, 'utf8')); } catch {}
const prev = Array.isArray(feed.items) ? feed.items.filter(it => !it.note && it.source !== '샘플' && !String(it.id).includes('sample')) : [];

// prepend + 중복 제거(원문 URL 우선, 없으면 id)
const seen = new Set();
const merged = [];
for (const it of [...norm, ...prev]) {
  const key = it.source_url || it.id;
  if (seen.has(key)) continue;
  seen.add(key);
  merged.push(it);
}

// 30일 트림
const cutoff = new Date(date + 'T00:00:00');
cutoff.setDate(cutoff.getDate() - (KEEP_DAYS - 1));
const cutoffStr = cutoff.toISOString().slice(0, 10);
const kept = merged.filter(it => it.date >= cutoffStr);

const out = {
  version: 1,
  updated_at: new Date().toISOString(),
  items: kept,
};
fs.writeFileSync(FEED, JSON.stringify(out, null, 2) + '\n');

fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
fs.writeFileSync(path.join(ARCHIVE_DIR, `${date}.json`), JSON.stringify({ date, items: norm }, null, 2) + '\n');

const re = norm.filter(i => i.category === 'realestate').length;
const ec = norm.filter(i => i.category === 'economy').length;
console.log(`병합 완료: ${date} 신규 ${norm.length}건(부동산 ${re}·경제 ${ec}) → feed 총 ${kept.length}건`);
