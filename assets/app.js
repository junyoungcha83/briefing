// 브리핑 — 정적 data/feed.json 을 읽어 블로그형으로 표시.
// 카드: 깃발(부동산=빨강·경제=파랑) + 헤드라인 + 4줄 미리보기. 클릭 시 전체 한글 본문 + 원문 링크.

const FEED_URL = 'data/feed.json';
const CAT = {
  realestate: { label: '부동산', cls: 'realestate' },
  economy:    { label: '경제',   cls: 'economy' },
};

let allItems = [];
let activeCat = 'all';
let activeYear = '';   // '' = 전체 연도, 아니면 'YYYY'
let activeMonth = '';  // '' = 전체 월, 아니면 'MM'

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function escapeAttr(s) { return escapeHtml(s); }

// 본문 줄바꿈 유지 + 이스케이프
function bodyHtml(s) {
  return escapeHtml(s).replace(/\n/g, '<br>');
}

function fmtUpdated(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const d = new Date(t);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())} 갱신`;
}

function fmtDateHeader(ds) {
  // ds: YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ds || '');
  if (!m) return ds || '';
  const today = new Date();
  const p = n => String(n).padStart(2, '0');
  const todayStr = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`;
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  const yestStr = `${yest.getFullYear()}-${p(yest.getMonth() + 1)}-${p(yest.getDate())}`;
  const label = `${+m[2]}월 ${+m[3]}일`;
  if (ds === todayStr) return `오늘 · ${label}`;
  if (ds === yestStr) return `어제 · ${label}`;
  return `${m[1]}. ${label}`;
}

async function load() {
  try {
    const res = await fetch(`${FEED_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    allItems = Array.isArray(data.items) ? data.items : [];
    populateYearOptions();
    const up = document.getElementById('updated');
    if (up) up.textContent = fmtUpdated(data.updated_at);
  } catch (e) {
    allItems = [];
    const feed = document.getElementById('feed');
    feed.innerHTML = `<div class="empty">브리핑을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>`;
    return;
  }
  render();
}

// ── 기사모음(블로그작성 앱에서 수동 저장) — 같은 오리진 localStorage 공유 ──
const COLLECTION_KEY = 'briefing-collection-v1';
function collectionItems() {
  try { const l = JSON.parse(localStorage.getItem(COLLECTION_KEY) || '[]'); return Array.isArray(l) ? l : []; }
  catch (e) { return []; }
}
function deleteCollection(id) {
  const list = collectionItems().filter(a => a.id !== id);
  try { localStorage.setItem(COLLECTION_KEY, JSON.stringify(list)); } catch (e) {}
  renderCollection();
}
function attachCardToggles(feed) {
  feed.querySelectorAll('.card').forEach(card => {
    const head = card.querySelector('.card-head');
    const preview = card.querySelector('.preview');
    const full = card.querySelector('.full');
    head.onclick = () => {
      const open = card.classList.toggle('open');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
      full.hidden = !open;
      if (preview) preview.style.display = open ? 'none' : '';
    };
  });
}
function renderCollection() {
  const feed = document.getElementById('feed');
  const items = collectionItems().slice().sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  if (!items.length) {
    feed.innerHTML = `<div class="empty">아직 저장한 기사가 없어요.<br>
      블로그작성 앱의 <b>결과</b>에서 <b>📌 브리핑에 저장</b>을 누르면 여기에 모입니다.</div>`;
    return;
  }
  feed.innerHTML = items.map(it => `
    <article class="card collection" data-id="${escapeAttr(it.id || '')}">
      <button class="card-head" type="button" aria-expanded="false">
        <span class="flag collection"></span>
        <span class="headline">${escapeHtml(it.headline || '')}</span>
      </button>
      <div class="preview">${escapeHtml(it.preview || '')}</div>
      <div class="full" hidden>
        <div class="body">${bodyHtml(it.body || '')}</div>
        <div class="meta">
          ${it.source ? `<span class="src">${escapeHtml(it.source)}</span>` : ''}
          ${it.source_url ? `<a class="origin" href="${escapeAttr(it.source_url)}" target="_blank" rel="noopener noreferrer">원문 보기 ↗</a>` : ''}
          <button class="del-collection" type="button" data-id="${escapeAttr(it.id || '')}">🗑 삭제</button>
        </div>
      </div>
    </article>`).join('');
  attachCardToggles(feed);
  feed.querySelectorAll('.del-collection').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    if (confirm('이 기사를 기사모음에서 삭제할까요?')) deleteCollection(b.dataset.id);
  });
}

function render() {
  const subf = document.getElementById('subfilters');
  if (activeCat === 'collection') { if (subf) subf.style.display = 'none'; renderCollection(); return; }
  if (subf) subf.style.display = '';
  const feed = document.getElementById('feed');
  const items = allItems
    .filter(it => activeCat === 'all' || it.category === activeCat)
    .filter(it => !activeYear || String(it.date).slice(0, 4) === activeYear)
    .filter(it => !activeMonth || String(it.date).slice(5, 7) === activeMonth)
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  if (!items.length) {
    feed.innerHTML = `<div class="empty">표시할 브리핑이 없어요.</div>`;
    return;
  }

  let lastDate = '';
  const html = items.map(it => {
    const cat = CAT[it.category] || { label: it.category || '', cls: 'realestate' };
    let header = '';
    if (it.date !== lastDate) {
      header = `<div class="date-header">${escapeHtml(fmtDateHeader(it.date))}</div>`;
      lastDate = it.date;
    }
    const src = it.source
      ? `<span class="src">${escapeHtml(it.source)}</span>`
      : '';
    const link = it.source_url
      ? `<a class="origin" href="${escapeAttr(it.source_url)}" target="_blank" rel="noopener noreferrer">원문 보기 ↗</a>`
      : '';
    return header + `
      <article class="card ${cat.cls}" data-id="${escapeAttr(it.id || '')}">
        <button class="card-head" type="button" aria-expanded="false">
          <span class="flag ${cat.cls}" title="${escapeAttr(cat.label)}"></span>
          <span class="headline">${escapeHtml(it.headline || '')}</span>
        </button>
        <div class="preview">${escapeHtml(it.preview || '')}</div>
        <div class="full" hidden>
          <div class="body">${bodyHtml(it.body || '')}</div>
          <div class="meta">${src}${link}</div>
        </div>
      </article>`;
  }).join('');

  feed.innerHTML = html;

  feed.querySelectorAll('.card').forEach(card => {
    const head = card.querySelector('.card-head');
    const preview = card.querySelector('.preview');
    const full = card.querySelector('.full');
    head.onclick = () => {
      const open = card.classList.toggle('open');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
      full.hidden = !open;
      if (preview) preview.style.display = open ? 'none' : '';
    };
  });
}

function bindFilters() {
  document.querySelectorAll('#filters .chip').forEach(btn => {
    btn.onclick = () => {
      activeCat = btn.dataset.cat;
      document.querySelectorAll('#filters .chip').forEach(b => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      render();
    };
  });
}

// 데이터에 존재하는 연도들을 연도 드롭다운에 채운다(내림차순). 기존 선택은 유지.
function populateYearOptions() {
  const sel = document.getElementById('yearSel');
  if (!sel) return;
  const years = [...new Set(allItems.map(it => String(it.date).slice(0, 4)).filter(y => /^\d{4}$/.test(y)))]
    .sort((a, b) => b.localeCompare(a));
  const prev = sel.value;
  sel.innerHTML = '<option value="">전체 연도</option>' +
    years.map(y => `<option value="${y}">${y}년</option>`).join('');
  // 이전 선택이 여전히 유효하면 유지
  sel.value = years.includes(prev) ? prev : '';
  activeYear = sel.value;
}

// 연도·월 드롭다운 + 초기화 버튼 동작
function bindSubFilters() {
  const yearSel = document.getElementById('yearSel');
  const monthSel = document.getElementById('monthSel');
  const resetBtn = document.getElementById('resetBtn');
  if (yearSel) yearSel.onchange = () => { activeYear = yearSel.value; render(); };
  if (monthSel) monthSel.onchange = () => { activeMonth = monthSel.value; render(); };
  if (resetBtn) resetBtn.onclick = () => {
    // 모든 필터 초기화 → 전체 보기
    activeCat = 'all';
    activeYear = '';
    activeMonth = '';
    if (yearSel) yearSel.value = '';
    if (monthSel) monthSel.value = '';
    document.querySelectorAll('#filters .chip').forEach(b => {
      const on = b.dataset.cat === 'all';
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    render();
  };
}

// ── 알아보기(자동매매 모의투자 일일 리포트) ──────────────
const STOCK_URL = 'data/stock.json';
let stockReports = null;   // null=아직 안 불러옴
let activeView = 'news';

const wonKR = n => (typeof n === 'number' && Number.isFinite(n)) ? Math.round(n).toLocaleString('ko-KR') : '—';
const signed = n => (typeof n === 'number' && Number.isFinite(n)) ? (n > 0 ? '+' : '') + Math.round(n).toLocaleString('ko-KR') : '—';

function bindViewTabs() {
  document.querySelectorAll('#viewtabs .vtab').forEach(btn => {
    btn.onclick = () => {
      activeView = btn.dataset.view;
      document.querySelectorAll('#viewtabs .vtab').forEach(b => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      const news = document.getElementById('view-news');
      const stock = document.getElementById('view-stock');
      if (news) news.classList.toggle('hidden', activeView !== 'news');
      if (stock) stock.classList.toggle('hidden', activeView !== 'stock');
      if (activeView === 'stock' && stockReports === null) loadStock();
    };
  });
}

async function loadStock() {
  const box = document.getElementById('stock');
  try {
    const res = await fetch(`${STOCK_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    stockReports = Array.isArray(data.reports) ? data.reports : [];
  } catch (e) {
    stockReports = [];
    if (box) box.innerHTML = `<div class="empty">아직 리포트가 없어요. 자동매매 일일 요약이 쌓이면 여기에 표시됩니다.</div>`;
    return;
  }
  renderStock();
}

function statCell(label, value, cls) {
  return `<div class="st-cell ${cls || ''}"><span class="st-label">${escapeHtml(label)}</span><span class="st-val">${value}</span></div>`;
}

// ── 수익률 정리(주간/월간) ─────────────────────────────
function periodOf(dateStr, unit) {
  const d = new Date(dateStr + 'T00:00:00');
  if (unit === 'month') {
    return { key: String(dateStr).slice(0, 7), label: `${d.getFullYear()}년 ${d.getMonth() + 1}월` };
  }
  const dow = (d.getDay() + 6) % 7;                       // 0 = 월요일
  const mon = new Date(d); mon.setDate(d.getDate() - dow);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const p2 = n => String(n).padStart(2, '0');
  return {
    key: `${mon.getFullYear()}-${p2(mon.getMonth() + 1)}-${p2(mon.getDate())}`,
    label: `${mon.getMonth() + 1}/${mon.getDate()}–${sun.getMonth() + 1}/${sun.getDate()}`,
  };
}
function summarizeReturns(reports, unit) {
  const asc = reports.slice().filter(r => typeof r.equity === 'number')
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const groups = new Map();
  for (const r of asc) {
    const { key, label } = periodOf(r.date, unit);
    let g = groups.get(key);
    if (!g) { g = { key, label, first: r, last: r, days: 0 }; groups.set(key, g); }
    g.last = r; g.days++;
  }
  const rows = [];
  for (const g of groups.values()) {
    const base = (typeof g.first.day_change === 'number') ? g.first.equity - g.first.day_change : g.first.equity;
    const end = g.last.equity;
    const abs = end - base;
    rows.push({ key: g.key, label: g.label, end, abs, pct: base ? (abs / base) * 100 : null, days: g.days });
  }
  return rows.sort((a, b) => b.key.localeCompare(a.key));  // 최신 기간 먼저
}
function returnTable(rows, emoji, title) {
  if (!rows.length) return '';
  const body = rows.map(r => {
    const cls = r.abs > 0 ? 'up' : (r.abs < 0 ? 'down' : '');
    const pct = (r.pct == null) ? '—' : `${r.pct > 0 ? '+' : ''}${r.pct.toFixed(2)}%`;
    return `<tr>
      <td class="rt-period">${escapeHtml(r.label)}</td>
      <td class="rt-num ${cls}"><b>${pct}</b></td>
      <td class="rt-num ${cls}">${signed(r.abs)}원</td>
      <td class="rt-num rt-eq">${wonKR(r.end)}원</td>
      <td class="rt-num rt-days">${r.days}일</td>
    </tr>`;
  }).join('');
  return `<section class="ret-block">
    <div class="ret-head"><h3>${emoji} ${title}</h3><span class="ret-hint">기간 시작가 대비 · 모의투자</span></div>
    <div class="ret-scroll"><table class="ret-table">
      <thead><tr><th>기간</th><th>수익률</th><th>변동액</th><th>기말 자산</th><th>일수</th></tr></thead>
      <tbody>${body}</tbody></table></div>
  </section>`;
}
// 알아보기 서브탭 / 자세히 단위 상태
let _stockSub = 'daily';     // 'daily' | 'detail'
let _detailUnit = 'month';   // 'month' | 'week'
let _detailFrom = null, _detailTo = null;   // 기간 범위(키). null = 전체

// 수익률 막대그래프(인라인 SVG) — 기간별 수익률(%)
function returnBarChart(rows) {
  if (!rows.length) return `<div class="muted">기간 데이터가 아직 부족해요.</div>`;
  const asc = rows.slice().sort((a, b) => a.key.localeCompare(b.key));
  const maxAbs = Math.max(0.01, ...asc.map(r => Math.abs(r.pct || 0)));
  const n = asc.length, bw = 46, gap = 16, padX = 30, padTop = 24, padBot = 42, plot = 150;
  const W = padX * 2 + n * bw + Math.max(0, n - 1) * gap;
  const H = padTop + plot + padBot;
  const zeroY = padTop + plot / 2;
  const scale = (plot / 2 - 8) / maxAbs;
  let bars = '';
  asc.forEach((r, i) => {
    const x = padX + i * (bw + gap);
    const pct = r.pct || 0;
    const h = Math.max(1, Math.abs(pct) * scale);
    const up = pct >= 0;
    const y = up ? zeroY - h : zeroY;
    const color = up ? '#dc2626' : '#2563eb';
    bars += `<rect x="${x}" y="${y.toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" rx="4" fill="${color}"/>`;
    bars += `<text x="${x + bw / 2}" y="${(up ? y - 6 : y + h + 14).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="${color}">${pct > 0 ? '+' : ''}${pct.toFixed(2)}%</text>`;
    bars += `<text x="${x + bw / 2}" y="${H - 14}" text-anchor="middle" font-size="10.5" fill="#64748b">${escapeHtml(r.label)}</text>`;
  });
  return `<div class="ret-chart-wrap"><svg class="ret-chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${_detailUnit === 'month' ? '월간' : '주간'} 수익률 추이">
    <line x1="${padX - 8}" y1="${zeroY}" x2="${W - padX + 8}" y2="${zeroY}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3 3"/>
    ${bars}
  </svg></div>`;
}
function stockDetailHTML(reports) {
  const unitLabel = _detailUnit === 'month' ? '월간' : '주간';
  const emoji = _detailUnit === 'month' ? '📅' : '🗓️';
  const all = summarizeReturns(reports, _detailUnit).slice().sort((a, b) => a.key.localeCompare(b.key));
  const keys = all.map(r => r.key);
  let from = (_detailFrom && keys.includes(_detailFrom)) ? _detailFrom : (keys[0] || '');
  let to = (_detailTo && keys.includes(_detailTo)) ? _detailTo : (keys[keys.length - 1] || '');
  if (from && to && from > to) { const t = from; from = to; to = t; }
  const rows = all.filter(r => (!from || r.key >= from) && (!to || r.key <= to));
  const opt = sel => all.map(r => `<option value="${r.key}"${r.key === sel ? ' selected' : ''}>${escapeHtml(r.label)}</option>`).join('');
  const isAll = (from === keys[0] && to === keys[keys.length - 1]);
  const rangeUI = all.length ? `
    <div class="ret-range">
      <span class="rr-lbl">기간</span>
      <select id="retFrom" aria-label="시작 기간">${opt(from)}</select>
      <span class="rr-sep">~</span>
      <select id="retTo" aria-label="종료 기간">${opt(to)}</select>
      <button id="retReset" type="button" class="rr-reset${isAll ? ' on' : ''}">전체</button>
    </div>` : '';
  return `
    <div class="ret-unitrow">
      <span class="ret-unitlabel">단위</span>
      <div class="ret-unit" role="group" aria-label="집계 단위">
        <button class="ret-unit-btn ${_detailUnit === 'month' ? 'on' : ''}" type="button" data-unit="month">📅 월간</button>
        <button class="ret-unit-btn ${_detailUnit === 'week' ? 'on' : ''}" type="button" data-unit="week">🗓️ 주간</button>
      </div>
    </div>
    ${rangeUI}
    <section class="ret-block">
      <div class="ret-head"><h3>${emoji} ${unitLabel} 수익률 추이</h3><span class="ret-hint">${rows.length}개 기간 · 기간 시작가 대비</span></div>
      ${returnBarChart(rows)}
    </section>
    ${returnTable(rows, emoji, unitLabel + ' 상세')}`;
}

function renderStock() {
  const box = document.getElementById('stock');
  if (!box) return;
  const reports = (stockReports || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (!reports.length) {
    box.innerHTML = `<div class="empty">아직 리포트가 없어요.</div>`;
    return;
  }
  box.innerHTML =
    `<div class="stock-subtabs">
       <button class="stock-subtab ${_stockSub === 'daily' ? 'on' : ''}" type="button" data-ssub="daily">📆 알아보기</button>
       <button class="stock-subtab ${_stockSub === 'detail' ? 'on' : ''}" type="button" data-ssub="detail">📊 자세히 알아보기</button>
     </div>
     <div class="stock-body">${_stockSub === 'detail' ? stockDetailHTML(reports) : stockDailyHTML(reports)}</div>`;
  document.querySelectorAll('.stock-subtab').forEach(b => b.onclick = () => { _stockSub = b.dataset.ssub; renderStock(); });
  document.querySelectorAll('.ret-unit-btn').forEach(b => b.onclick = () => { _detailUnit = b.dataset.unit; _detailFrom = null; _detailTo = null; renderStock(); });
  const rf = document.getElementById('retFrom'); if (rf) rf.onchange = () => { _detailFrom = rf.value; renderStock(); };
  const rt = document.getElementById('retTo'); if (rt) rt.onchange = () => { _detailTo = rt.value; renderStock(); };
  const rr = document.getElementById('retReset'); if (rr) rr.onclick = () => { _detailFrom = null; _detailTo = null; renderStock(); };
}
function stockDailyHTML(reports) {
  return reports.map(r => {
    const chCls = (typeof r.day_change === 'number') ? (r.day_change > 0 ? 'up' : (r.day_change < 0 ? 'down' : '')) : '';
    const chTxt = (typeof r.day_change === 'number')
      ? `${signed(r.day_change)}원${typeof r.day_change_pct === 'number' ? ` (${r.day_change_pct > 0 ? '+' : ''}${r.day_change_pct}%)` : ''}`
      : '—';
    const stats = `<div class="st-grid">
      ${statCell('자산', wonKR(r.equity) + '원')}
      ${statCell('전일대비', chTxt, chCls)}
      ${statCell('실현손익 누계', signed(r.realized_cum) + '원')}
      ${statCell('평가손익', signed(r.unrealized) + '원')}
      ${statCell('보유', (r.n_pos ?? (r.holdings ? r.holdings.length : 0)) + '종목')}
      ${statCell('현금', wonKR(r.cash) + '원')}
    </div>`;

    const trades = (r.trades && r.trades.length)
      ? `<div class="rp-sec"><h3>오늘 매매</h3>${r.trades.map(t => {
          const buy = t.action !== 'sell';
          return `<div class="trade ${buy ? 'buy' : 'sell'}"><span class="tr-tag">${buy ? '🟢 샀어요' : '🔴 팔았어요'}</span>
            <b>${escapeHtml(t.name || t.ticker || '')}</b>${t.ticker ? ` <span class="tk">${escapeHtml(t.ticker)}</span>` : ''}
            <div class="tr-reason">${escapeHtml(t.reason || '')}</div></div>`;
        }).join('')}</div>`
      : `<div class="rp-sec"><h3>오늘 매매</h3><div class="muted">오늘은 사고판 종목이 없어요.</div></div>`;

    const holds = (r.holdings && r.holdings.length)
      ? `<div class="rp-sec"><h3>보유 종목</h3><div class="holds">${r.holdings.map(h =>
          `<div class="hold"><span class="hd-flag ${h.market === 'us' ? 'us' : 'kr'}">${h.market === 'us' ? '🇺🇸' : '🇰🇷'}</span>
            <b>${escapeHtml(h.name || h.ticker || '')}</b> <span class="tk">${escapeHtml(h.ticker || '')}</span>
            <span class="hd-sh">${h.shares != null ? escapeHtml(h.shares) + '주' : ''}</span>
            ${h.note ? `<div class="hd-note">${escapeHtml(h.note)}</div>` : ''}</div>`
        ).join('')}</div></div>`
      : '';

    const note = r.market_note ? `<div class="rp-sec"><h3>시장 코멘트</h3><div class="body">${bodyHtml(r.market_note)}</div></div>` : '';

    const terms = (r.terms && r.terms.length)
      ? `<div class="rp-sec"><h3>용어 풀이</h3>${r.terms.map(t =>
          `<div class="term"><b>${escapeHtml(t.term || '')}</b><span>${escapeHtml(t.plain || '')}</span></div>`).join('')}</div>`
      : '';

    const raw = (r.telegram_raw && r.telegram_raw.length)
      ? `<details class="rp-raw"><summary>텔레그램 원문 보기</summary><pre>${escapeHtml(r.telegram_raw.join('\n\n'))}</pre></details>`
      : '';

    return `<article class="report">
      <div class="rp-head"><span class="rp-date">${escapeHtml(fmtDateHeader(r.date))}</span><span class="rp-badge">모의투자</span></div>
      ${r.one_liner ? `<div class="rp-oneliner">${escapeHtml(r.one_liner)}</div>` : ''}
      ${stats}
      ${trades}
      ${holds}
      ${note}
      ${terms}
      ${raw}
    </article>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  bindFilters();
  bindSubFilters();
  bindViewTabs();
  load();
  // 다시 보일 때 최신으로 갱신 (매일 6시 업데이트 반영 + 기사모음 반영)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      load();
      if (activeCat === 'collection') renderCollection();
      if (activeView === 'stock') loadStock();
    }
  });
  // 블로그작성 앱이 다른 탭에서 저장하면(같은 오리진) 즉시 반영
  window.addEventListener('storage', (e) => {
    if (e.key === COLLECTION_KEY && activeCat === 'collection') renderCollection();
  });
});
