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

function render() {
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

function renderStock() {
  const box = document.getElementById('stock');
  if (!box) return;
  const reports = (stockReports || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (!reports.length) {
    box.innerHTML = `<div class="empty">아직 리포트가 없어요.</div>`;
    return;
  }
  box.innerHTML = reports.map(r => {
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
  // 다시 보일 때 최신으로 갱신 (매일 6시 업데이트 반영)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      load();
      if (activeView === 'stock') loadStock();
    }
  });
});
