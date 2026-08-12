// 브리핑 기사모음 — 동기화 API (개인용, 토큰 보호)
// - GET /api/collection : X-Edit-Token 일치 시 전체 목록 반환
// - PUT /api/collection : X-Edit-Token 일치 시 전체 목록 저장
// KV: COLLECTION (단일 키 "briefing-collection")  ·  Secret: EDIT_TOKEN

const KEY = 'briefing-collection';
const MAX_BYTES = 4 * 1024 * 1024;

const ALLOWED_ORIGINS = [
  'https://junyoungcha83.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
];
function corsHeaders(req) {
  const origin = req.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Edit-Token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
function json(body, status, extra) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}
const isValid = (p) => p && typeof p === 'object' && Array.isArray(p.items);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(req);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    if (url.pathname === '/api/collection') {
      const token = req.headers.get('X-Edit-Token') || '';
      if (!env.EDIT_TOKEN || token !== env.EDIT_TOKEN) return json({ error: 'unauthorized' }, 401, cors);

      if (req.method === 'GET') {
        const raw = await env.COLLECTION.get(KEY);
        return new Response(raw || JSON.stringify({ items: [] }), {
          headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      }
      if (req.method === 'PUT') {
        const body = await req.text();
        if (body.length > MAX_BYTES) return json({ error: 'too_large' }, 413, cors);
        let parsed;
        try { parsed = JSON.parse(body); } catch { return json({ error: 'invalid_json' }, 400, cors); }
        if (!isValid(parsed)) return json({ error: 'invalid_shape' }, 400, cors);
        await env.COLLECTION.put(KEY, body);
        return json({ ok: true, count: parsed.items.length }, 200, cors);
      }
      return json({ error: 'method_not_allowed' }, 405, cors);
    }

    if (url.pathname === '/' || url.pathname === '/api/health') return json({ ok: true, service: 'briefing-collection-api' }, 200, cors);
    return new Response('Not Found', { status: 404, headers: cors });
  },
};
