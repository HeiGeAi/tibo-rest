import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const loader = source.slice(source.indexOf('async function fetchJson('), source.indexOf('function wireUi('));
const ok = (data, etag = null) => ({ status: 200, ok: true, json: async () => data, headers: { get: () => etag } });
const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup() {
  const calls = [], rendered = [], notices = [], errors = [], button = { disabled: false };
  const ctx = vm.createContext({
    state: { payload: null, livePayload: null, source: 'none', etag: null },
    $: () => button, API_URL: 'mock-live', FALLBACK_URL: 'mock-fallback',
    console: { warn: (...args) => errors.push(args), error: (...args) => errors.push(args) },
    toast: (s) => notices.push(s), renderStatus: (p) => rendered.push(p),
    fetch: (url, opts) => {
      const pending = deferred();
      calls.push({ url, opts, ...pending });
      return pending.promise;
    },
  });
  vm.runInContext(loader, ctx);
  return { ctx, calls, rendered, notices, errors, button };
}

test('late older live response cannot replace newer payload, live cache, ETag or toast', async () => {
  const { ctx, calls, rendered, notices, button } = setup();
  const older = ctx.loadData(), newer = ctx.loadData();
  const fresh = { events: ['fresh'] };
  calls[1].resolve(ok(fresh, 'fresh-etag'));
  await newer;
  assert.equal(button.disabled, false);
  calls[0].resolve(ok({ events: ['stale'] }, 'stale-etag'));
  await older;
  assert.equal(ctx.state.payload, fresh);
  assert.equal(ctx.state.livePayload, fresh);
  assert.equal(ctx.state.etag, 'fresh-etag');
  assert.equal(ctx.state.source, 'live');
  assert.deepEqual(rendered, [fresh]);
  assert.deepEqual(notices, ['Radar updated']);
});

test('superseded request finishing first cannot render or unlock the newer refresh', async () => {
  const { ctx, calls, rendered, notices, button } = setup();
  const older = ctx.loadData(), newer = ctx.loadData({ silent: true });
  calls[0].resolve(ok({ events: ['stale'] }, 'stale-etag'));
  await older;
  assert.equal(button.disabled, true);
  assert.equal(ctx.state.payload, null);
  assert.deepEqual(rendered, []);
  assert.deepEqual(notices, []);
  calls[1].resolve(ok({ events: ['fresh'] }, 'fresh-etag'));
  await newer;
  assert.equal(button.disabled, false);
  assert.deepEqual(notices, []);
});

test('superseded live failure does not start fallback or emit stale errors', async () => {
  const { ctx, calls, errors, notices, button } = setup();
  const older = ctx.loadData(), newer = ctx.loadData({ silent: true });
  calls[0].reject(Error('synthetic stale live failure'));
  await tick();
  // Settle unexpected old-code fallback too, so the fail-before run cannot hang.
  calls[2]?.resolve(ok({ events: ['stale fallback'] }));
  await older;
  assert.equal(calls.length, 2);
  assert.equal(button.disabled, true);
  assert.deepEqual(errors, []);
  assert.deepEqual(notices, []);
  calls[1].resolve(ok({ events: ['fresh'] }, 'fresh-etag'));
  await newer;
});

test('late older fallback cannot replace a newer successful live refresh', async () => {
  const { ctx, calls, rendered, notices, button } = setup();
  const older = ctx.loadData();
  calls[0].reject(Error('synthetic outage'));
  await tick();
  assert.equal(calls[1].url, 'mock-fallback');
  const newer = ctx.loadData();
  const fresh = { events: ['fresh'] };
  calls[2].resolve(ok(fresh, 'fresh-etag'));
  await newer;
  calls[1].resolve(ok({ events: ['stale snapshot'] }));
  await older;
  assert.equal(ctx.state.payload, fresh);
  assert.equal(ctx.state.livePayload, fresh);
  assert.equal(ctx.state.source, 'live');
  assert.equal(ctx.state.etag, 'fresh-etag');
  assert.deepEqual(rendered, [fresh]);
  assert.deepEqual(notices, ['Radar updated']);
  assert.equal(button.disabled, false);
});

test('stale fallback failure cannot toast or unlock a newer pending refresh', async () => {
  const { ctx, calls, notices, errors, button } = setup();
  const older = ctx.loadData();
  calls[0].reject(Error('synthetic outage'));
  await tick();
  const newer = ctx.loadData({ silent: true });
  calls[1].reject(Error('synthetic stale snapshot failure'));
  await older;
  assert.deepEqual(notices, []);
  assert.equal(errors.length, 1); // Only the original live failure, before supersession.
  assert.equal(button.disabled, true);
  calls[2].resolve(ok({ events: ['fresh'] }));
  await newer;
  assert.equal(button.disabled, false);
});

test('body parsing completed late is stale even when its response headers arrived first', async () => {
  const { ctx, calls, rendered } = setup();
  const body = deferred();
  const older = ctx.loadData({ silent: true });
  calls[0].resolve({ ...ok(null, 'old-etag'), json: () => body.promise });
  await tick();
  const newer = ctx.loadData({ silent: true });
  const fresh = { events: ['fresh'] };
  calls[1].resolve(ok(fresh, 'new-etag'));
  await newer;
  body.resolve({ events: ['old'] });
  await older;
  assert.equal(ctx.state.payload, fresh);
  assert.equal(ctx.state.etag, 'new-etag');
  assert.deepEqual(rendered, [fresh]);
});

test('newest fallback wins and a later 304 uses the last accepted live cache and ETag', async () => {
  const { ctx, calls } = setup();
  const seed = { events: ['accepted live'] }, snapshot = { events: ['snapshot'] };
  const initial = ctx.loadData({ silent: true });
  calls[0].resolve(ok(seed, 'seed-etag'));
  await initial;
  const older = ctx.loadData({ silent: true }), newer = ctx.loadData({ silent: true });
  calls[2].reject(Error('synthetic latest outage'));
  await tick();
  calls[3].resolve(ok(snapshot));
  await newer;
  calls[1].resolve(ok({ events: ['unaccepted older live'] }, 'stale-etag'));
  await older;
  assert.equal(ctx.state.payload, snapshot);
  assert.equal(ctx.state.source, 'fallback');
  assert.equal(ctx.state.livePayload, seed);
  assert.equal(ctx.state.etag, 'seed-etag');
  const recovery = ctx.loadData({ silent: true });
  assert.equal(calls[4].opts.headers['If-None-Match'], 'seed-etag');
  calls[4].resolve({ status: 304 });
  await recovery;
  assert.equal(ctx.state.payload, seed);
  assert.equal(ctx.state.source, 'live');
});

test('superseded 304 cannot restore live data over the latest fallback', async () => {
  const { ctx, calls, rendered, notices } = setup();
  const seed = { events: ['accepted live'] }, snapshot = { events: ['snapshot'] };
  const initial = ctx.loadData({ silent: true });
  calls[0].resolve(ok(seed, 'seed-etag'));
  await initial;
  const older = ctx.loadData(), newer = ctx.loadData();
  calls[2].reject(Error('synthetic latest outage'));
  await tick();
  calls[3].resolve(ok(snapshot));
  await newer;
  calls[1].resolve({ status: 304 });
  await older;
  assert.equal(ctx.state.payload, snapshot);
  assert.equal(ctx.state.source, 'fallback');
  assert.equal(ctx.state.livePayload, seed);
  assert.equal(ctx.state.etag, 'seed-etag');
  assert.deepEqual(rendered, [seed, snapshot]);
  assert.deepEqual(notices, ['Live API unavailable · using snapshot']);
});

test('latest double failure unlocks refresh while stale work remains ignored', async () => {
  const { ctx, calls, rendered, notices, button } = setup();
  const older = ctx.loadData(), newer = ctx.loadData();
  calls[1].reject(Error('synthetic live failure'));
  await tick();
  calls[2].reject(Error('synthetic fallback failure'));
  await newer;
  assert.equal(button.disabled, false);
  calls[0].resolve(ok({ events: ['stale'] }, 'stale-etag'));
  await older;
  assert.equal(ctx.state.payload, null);
  assert.equal(ctx.state.livePayload, null);
  assert.equal(ctx.state.etag, null);
  assert.deepEqual(rendered, []);
  assert.deepEqual(notices, ['Could not load reset data']);
});
