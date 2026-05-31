// 브리핑 — 정적 data/feed.json 을 읽어 블로그형으로 표시.
// 카드: 깃발(부동산=빨강·경제=파랑) + 헤드라인 + 4줄 미리보기. 클릭 시 전체 한글 본문 + 원문 링크.

const FEED_URL = 'data/feed.json';
const CAT = {
  realestate: { label: '부동산', cls: 'realestate' },
  economy:    { label: '경제',   cls: 'economy' },
};

let allItems = [];
let activeCat = 'all';

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

document.addEventListener('DOMContentLoaded', () => {
  bindFilters();
  load();
  // 다시 보일 때 최신으로 갱신 (매일 6시 업데이트 반영)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') load();
  });
});
