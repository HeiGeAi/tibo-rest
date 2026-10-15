import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import http from 'node:http';
import { once } from 'node:events';
const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const loader = source.slice(source.indexOf('async function fetchJson('), source.indexOf('function wireUi('));
const ok = (data, etag = null) => ({ status: 200, ok: true, json: async () => data, headers: { get: () => etag } });
function setup(replies) {
  const calls = [], rendered = [], notices = [], button = { disabled: false };
  const ctx = vm.createContext({
    state: { payload: null, livePayload: null, source: 'none', etag: null },
    $: () => button, API_URL: 'mock-live', FALLBACK_URL: 'mock-fallback',
    console: { warn() {}, error() {} }, toast: (s) => notices.push(s), renderStatus: (p) => rendered.push(p),
    fetch: async (url, opts) => { calls.push({ url, opts }); const reply = replies.shift(); if (reply instanceof Error) throw reply; return reply; },
  });
  vm.runInContext(loader, ctx);
  return { ctx, calls, rendered, notices, button };
}
test('live 200 → outage/fallback → live 304 restores live payload and source', async () => {
  const live = { events: ['new'] }, fallback = { events: ['old'] };
  const { ctx, rendered, calls, button } = setup([ok(live, 'etag-live'), Error('outage'), ok(fallback), { status: 304 }]);
  await ctx.loadData(); await ctx.loadData();
  assert.equal(ctx.state.source, 'fallback');
  await ctx.loadData();
  assert.equal(ctx.state.payload, live);
  assert.equal(ctx.state.source, 'live');
  assert.equal(ctx.state.etag, 'etag-live');
  assert.equal(rendered.at(-1), live);
  assert.equal(calls.at(-1).opts.headers['If-None-Match'], 'etag-live');
  assert.equal(button.disabled, false);
});
test('first load failure uses fallback without attaching its payload to a live ETag', async () => {
  const live = { events: ['new'] };
  const { ctx, calls } = setup([Error('offline'), ok({ events: ['old'] }), ok(live, 'fresh')]);
  await ctx.loadData();
  assert.equal(ctx.state.livePayload, null);
  await ctx.loadData({ silent: true });
  assert.equal(calls.at(-1).opts.headers['If-None-Match'], undefined);
  assert.equal(ctx.state.payload, live);
});
test('unsolicited 304 with no live cache falls back instead of reporting fresh', async () => {
  const { ctx, notices, button } = setup([{ status: 304 }, ok({ events: [] })]);
  await ctx.loadData();
  assert.equal(ctx.state.source, 'fallback');
  assert.ok(!notices.includes('Radar already fresh'));
  assert.equal(button.disabled, false);
});
test('failed live and fallback requests retain the last good live data for 304 recovery', async () => {
  const live = { events: ['new'] };
  const { ctx, button } = setup([ok(live, 'etag'), Error('live'), Error('fallback'), { status: 304 }]);
  await ctx.loadData(); await ctx.loadData(); await ctx.loadData();
  assert.equal(ctx.state.payload, live);
  assert.equal(ctx.state.source, 'live');
  assert.equal(button.disabled, false);
});
test('later 200 replaces cached live data and ETag, including a missing ETag', async () => {
  const latest = { events: ['latest'] };
  const { ctx, calls } = setup([ok({ events: [] }, 'old'), ok(latest), ok(latest)]);
  await ctx.loadData(); await ctx.loadData(); await ctx.loadData();
  assert.equal(ctx.state.livePayload, latest);
  assert.equal(ctx.state.etag, null);
  assert.equal(calls.at(-1).opts.headers['If-None-Match'], undefined);
});


test('real HTTP ETag recovery replaces the fallback after a 304 response', async (t) => {
  let liveRequests = 0;
  const receivedEtags = [];
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/snapshot') return res.end(JSON.stringify({ events: ['old snapshot'] }));
    receivedEtags.push(req.headers['if-none-match']);
    liveRequests++;
    if (liveRequests === 2) { res.writeHead(503); return res.end('{}'); }
    if (liveRequests === 3) { res.writeHead(304); return res.end(); }
    res.setHeader('ETag', '"live-v1"');
    res.end(JSON.stringify({ events: ['fresh live'] }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const { ctx, rendered } = setup([]);
  Object.assign(ctx, { fetch, API_URL: base + '/live', FALLBACK_URL: base + '/snapshot' });
  await ctx.loadData();
  await ctx.loadData();
  assert.equal(ctx.state.source, 'fallback');
  assert.equal(ctx.state.payload.events[0], 'old snapshot');
  await ctx.loadData();
  assert.equal(ctx.state.source, 'live');
  assert.equal(ctx.state.payload.events[0], 'fresh live');
  assert.equal(rendered.at(-1), ctx.state.livePayload);
  assert.deepEqual(receivedEtags, [undefined, '"live-v1"', '"live-v1"']);
});
