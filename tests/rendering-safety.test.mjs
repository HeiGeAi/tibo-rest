import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const helpersAndRender = source.slice(
  source.indexOf('function escapeHtml('),
  source.indexOf('async function fetchJson(')
);

function createStorage(initial = {}, { throwOnWrite = false, throwOnRead = false } = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      if (throwOnRead) throw new Error('storage read blocked');
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      if (throwOnWrite) throw new Error('QuotaExceededError');
      store.set(key, String(value));
    },
    removeItem(key) {
      if (throwOnWrite) throw new Error('SecurityError');
      store.delete(key);
    },
  };
}

function setup(storageOpts = {}) {
  const elements = new Map();
  const makeEl = () => ({
    innerHTML: '',
    textContent: '',
    value: '',
    hidden: false,
    className: '',
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
    },
  });
  const $ = (id) => {
    if (!elements.has(id)) elements.set(id, makeEl());
    return elements.get(id);
  };
  const vigilCard = makeEl();
  const ctx = vm.createContext({
    URL,
    Intl,
    Date,
    Array,
    Number,
    String,
    Math,
    JSON,
    CONFIG: { aihotCalendar: 'https://aihot.news/codex-reset' },
    HANDLE: 'thsottiaux',
    PRAYER_KEY: 'tibo.rest.prayers.v1',
    VIGIL_KEY: 'tibo.rest.vigil.v1',
    state: { payload: null, source: 'live', etag: null, livePayload: null, lampDimmed: false },
    localStorage: createStorage(storageOpts.initial, storageOpts),
    document: { querySelector: () => vigilCard },
    $,
    revealListItems: () => {},
    tickClock: (el, next) => { el.textContent = next; },
  });
  vm.runInContext(helpersAndRender, ctx);
  return { ctx, $, vigilCard };
}

test('renderTimeline strips unsafe javascript:/data: URLs from untrusted feed entries', () => {
  const { ctx, $ } = setup();
  ctx.renderTimeline([
    {
      type: 'direct_reset',
      status: 'confirmed',
      confirmedAt: '2026-11-20T00:00:00Z',
      title: 'Untrusted payload',
      url: 'javascript:alert(1)',
      posts: [
        {
          publishedAt: '2026-11-20T00:00:00Z',
          text: 'hello',
          url: 'javascript:alert(2)',
        },
      ],
    },
    {
      type: 'reset_credit',
      status: 'confirmed',
      createdAt: '2026-11-19T00:00:00Z',
      title: 'Data URI payload',
      url: 'data:text/html,<script>alert(3)</script>',
      posts: [
        {
          publishedAt: '2026-11-19T00:00:00Z',
          text: 'valid',
          url: 'https://x.com/thsottiaux/status/123',
        },
      ],
    },
  ]);

  const html = $('timeline').innerHTML;
  assert.ok(!/javascript:/i.test(html), 'must not emit javascript: URLs');
  assert.ok(!/data:text\/html/i.test(html), 'must not emit data: URLs');
  assert.ok(html.includes('href="https://aihot.news/codex-reset"'), 'unsafe event URL falls back to safe AIHOT calendar URL');
  assert.ok(html.includes('href="https://x.com/thsottiaux/status/123"'), 'valid https post URL is preserved');
  assert.ok(html.includes('rel="noopener noreferrer"'), 'external links include noreferrer');
});

test('corrupted localStorage entries for prayers and vigil do not crash startup', () => {
  for (const badPrayers of ['null', '{}', '42', 'not-json', JSON.stringify([{ text: 'x', at: 'invalid' }, null, 123])]) {
    const { ctx, $ } = setup({
      initial: {
        'tibo.rest.prayers.v1': badPrayers,
        'tibo.rest.vigil.v1': JSON.stringify({ at: 'not-a-date' }),
      },
    });
    assert.doesNotThrow(() => ctx.renderPrayers());
    assert.doesNotThrow(() => ctx.renderVigil());
    assert.ok($('prayer-list').innerHTML.includes('No local prayers yet'));
    assert.equal($('vigil-status').textContent, 'not stamped');
  }
});

test('storage write/read failures return false or empty safely instead of throwing', () => {
  const { ctx } = setup({ throwOnWrite: true, throwOnRead: true });
  assert.deepEqual(Array.from(ctx.loadPrayers()), []);
  assert.equal(ctx.loadVigil(), null);
  assert.equal(ctx.savePrayers([{ text: 'hi', at: Date.now() }]), false);
  assert.equal(ctx.saveVigil({ at: Date.now() }), false);
  assert.equal(ctx.saveVigil(null), false);
});

test('date helpers handle Invalid Date safely without throwing RangeError or returning NaN', () => {
  const { ctx } = setup();
  const bad = new Date('invalid');
  assert.equal(ctx.fmtBeijing(bad), '—');
  assert.equal(ctx.hoursAgo(bad), null);
  assert.equal(ctx.relativeRest(bad), 'unknown');
  assert.equal(ctx.lobbyClock(bad), '—');
});

test('renderStatus and timeline tolerate non-array events payloads', () => {
  const { ctx, $ } = setup();
  assert.doesNotThrow(() => ctx.renderStatus({ events: 'malformed', checkedAt: 'bad-date' }));
  assert.equal($('event-count').textContent, '0');
  assert.equal($('checked-at').textContent, '—');
  assert.ok($('timeline').innerHTML.includes('No events yet.'));
});
