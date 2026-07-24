#!/usr/bin/env node
// 오늘자 자동매매(모의투자) 리포트를 data/stock.json 에 병합한다.
//   node scripts/build-stock.mjs data/_stock_today.json
// _stock_today.json 형식(1일치 report 1개):
// {
//   "date":"YYYY-MM-DD", "one_liner":"...", "equity":숫자, "day_change":숫자, "day_change_pct":숫자,
//   "realized_cum":숫자, "unrealized":숫자, "cash":숫자, "n_pos":숫자,
//   "holdings":[{"name":"","ticker":"","market":"kr|us","shares":0,"note":""}],
//   "trades":[{"action":"buy|sell","name":"","ticker":"","reason":""}],
//   "market_note":"...", "terms":[{"term":"","plain":""}], "telegram_raw":["...", ...]
// }
//
// 동작: 오늘 report 를 최신순 prepend → 같은 date 는 새것으로 교체 → 전체 보존
//       → data/stock.json 저장. updated_at 갱신.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const STOCK = path.join(ROOT, 'data', 'stock.json');

const todayPath = process.argv[2];
if (!todayPath) { console.error('사용법: node scripts/build-stock.mjs <stock_today.json>'); process.exit(1); }

const raw = JSON.parse(fs.readFileSync(todayPath, 'utf8'));
const date = String(raw.date || '').trim();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.error('date 가 YYYY-MM-DD 형식이 아님:', date); process.exit(1); }

const num = v => (typeof v === 'number' && Number.isFinite(v)) ? v : (Number.isFinite(+v) ? +v : null);
const str = v => String(v == null ? '' : v).trim();

const report = {
  date,
  one_liner: str(raw.one_liner),
  equity: num(raw.equity),
  day_change: num(raw.day_change),
  day_change_pct: num(raw.day_change_pct),
  realized_cum: num(raw.realized_cum),
  unrealized: num(raw.unrealized),
  cash: num(raw.cash),
  n_pos: num(raw.n_pos),
  holdings: Array.isArray(raw.holdings) ? raw.holdings.map(h => ({
    name: str(h.name), ticker: str(h.ticker), market: str(h.market),
    shares: num(h.shares), note: str(h.note),
  })) : [],
  trades: Array.isArray(raw.trades) ? raw.trades.map(t => ({
    action: t.action === 'sell' ? 'sell' : 'buy',
    name: str(t.name), ticker: str(t.ticker), reason: str(t.reason),
  })) : [],
  market_note: str(raw.market_note),
  terms: Array.isArray(raw.terms) ? raw.terms.map(t => ({ term: str(t.term), plain: str(t.plain) })) : [],
  telegram_raw: Array.isArray(raw.telegram_raw) ? raw.telegram_raw.map(str).filter(Boolean) : [],
};

// 기존 로드 + 같은 날짜 교체 + 최신순
let store = { version: 1, reports: [] };
try { store = JSON.parse(fs.readFileSync(STOCK, 'utf8')); } catch {}
const prev = Array.isArray(store.reports) ? store.reports.filter(r => r.date !== date) : [];
const reports = [report, ...prev].sort((a, b) => String(b.date).localeCompare(String(a.date)));

const out = { version: 1, updated_at: new Date().toISOString(), reports };
fs.writeFileSync(STOCK, JSON.stringify(out, null, 2) + '\n');

console.log(`병합 완료: ${date} 리포트 → stock 총 ${reports.length}일치 (매매 ${report.trades.length}·보유 ${report.holdings.length})`);
