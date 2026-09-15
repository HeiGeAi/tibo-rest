import { CONFIG } from "./config.js";
import {
  initMotion,
  revealListItems,
  tickClock,
  prefersReducedMotion,
  gsap,
} from "./motion.js";

const API_URL = CONFIG.apiUrl;
const FALLBACK_URL = CONFIG.fallbackUrl;
const POLL_MS = CONFIG.pollMs;
const HANDLE = CONFIG.tiboHandle;
const PRAYER_KEY = CONFIG.prayerKey;
const VIGIL_KEY = CONFIG.vigilKey;

const $ = (id) => document.getElementById(id);

const state = {
  payload: null,
  source: "none",
  etag: null,
  lampDimmed: false,
};

const motion = initMotion();

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2200);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseTs(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtBeijing(d) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function hoursAgo(d) {
  if (!d) return null;
  return (Date.now() - d.getTime()) / 36e5;
}

/** Compact label for tweets / vigil: 42m · 12.4h · 2.1d */
function relativeRest(d) {
  const h = hoursAgo(d);
  if (h == null) return "unknown";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

/** Lobby-sign hero clock: "12h 34m" / "2d 5h" / "18m" */
function lobbyClock(d) {
  if (!d) return "—";
  const ms = Math.max(0, Date.now() - d.getTime());
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days >= 1) return `${days}d ${hours}h`;
  if (hours >= 1) return `${hours}h ${mins}m`;
  return `${Math.max(1, mins)}m`;
}

function eventTime(e) {
  return parseTs(e.confirmedAt) || parseTs(e.createdAt) || parseTs(e.updatedAt);
}

function primaryPost(e) {
  const posts = Array.isArray(e.posts) ? e.posts.slice() : [];
  posts.sort((a, b) =>
    String(b.publishedAt || "").localeCompare(String(a.publishedAt || ""))
  );
  return posts[0] || null;
}

function latestDirectReset(events) {
  const directs = (events || []).filter(
    (e) => e.type === "direct_reset" && (e.status === "confirmed" || e.confirmedAt)
  );
  directs.sort((a, b) => {
    const ta = eventTime(a)?.getTime() || 0;
    const tb = eventTime(b)?.getTime() || 0;
    return tb - ta;
  });
  return directs[0] || null;
}

function buildTweetText(restLabel, extra) {
  const note = (extra || "").trim();
  const lines = [
    `@${HANDLE} resting at tibo.rest`,
    `usage exhausted · resting for ${restLabel}`,
  ];
  if (note) lines.push(note.slice(0, 180));
  lines.push("mercy?");
  return lines.join("\n");
}

function openTweet(text) {
  const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function loadPrayers() {
  try {
    return JSON.parse(localStorage.getItem(PRAYER_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePrayers(list) {
  localStorage.setItem(PRAYER_KEY, JSON.stringify(list.slice(0, 40)));
}

function renderPrayers() {
  const list = loadPrayers();
  const ul = $("prayer-list");
  if (!list.length) {
    ul.innerHTML = `<li class="empty">No local prayers yet. Leave one — it stays in your browser.<br />还没有本地许愿。写一句，只存在这台设备。</li>`;
    return;
  }
  ul.innerHTML = list
    .map(
      (p) =>
        `<li>${escapeHtml(p.text)}<span class="when">${escapeHtml(
          fmtBeijing(new Date(p.at))
        )} · Beijing</span></li>`
    )
    .join("");
  revealListItems(".prayers li:not(.empty)", ul);
}

function loadVigil() {
  try {
    return JSON.parse(localStorage.getItem(VIGIL_KEY) || "null");
  } catch {
    return null;
  }
}

function saveVigil(stamp) {
  if (!stamp) {
    localStorage.removeItem(VIGIL_KEY);
    return;
  }
  localStorage.setItem(VIGIL_KEY, JSON.stringify(stamp));
}

function renderVigil() {
  const stamp = loadVigil();
  const card = document.querySelector(".vigil-panel");
  const status = $("vigil-status");
  const meta = $("vigil-meta");
  const btn = $("vigil-btn");
  if (!stamp) {
    card?.classList.remove("is-active");
    status.textContent = "not stamped";
    meta.textContent = "Tap to leave a quiet “I’m resting” mark.";
    btn.textContent = "I’m resting";
    return;
  }
  card?.classList.add("is-active");
  const since = relativeRest(new Date(stamp.at));
  status.textContent = `resting · ${since}`;
  meta.textContent = `Stamped ${fmtBeijing(new Date(stamp.at))} Beijing · local only`;
  btn.textContent = "Clear stamp";
}

function renderTimeline(events) {
  const sorted = (events || []).slice().sort((a, b) => {
    const ta = eventTime(a)?.getTime() || 0;
    const tb = eventTime(b)?.getTime() || 0;
    return tb - ta;
  });
  const top = sorted.slice(0, 16);
  const ul = $("timeline");
  if (!top.length) {
    ul.innerHTML = `<li class="event"><div></div><div>No events yet.</div></li>`;
    return;
  }
  ul.innerHTML = top
    .map((e) => {
      const post = primaryPost(e);
      const when = eventTime(e);
      const badgeClass = e.type === "direct_reset" ? "reset" : "credit";
      const badge = e.type === "direct_reset" ? "RESET" : "CARD";
      const body =
        (post && (post.originalText || post.text)) || e.title || e.label || "";
      const xUrl = post?.url || "";
      const aihotUrl = e.url || CONFIG.aihotCalendar;
      return `<li class="event">
          <div class="badge ${badgeClass}">${badge}</div>
          <div>
            <div class="title">${escapeHtml(e.title || e.label || e.type)}</div>
            <div class="body">${escapeHtml(body)}</div>
            <div class="mono">${escapeHtml(fmtBeijing(when))} · Beijing${
              e.scope ? " · " + escapeHtml(e.scope) : ""
            }</div>
            <div class="links">
              ${
                xUrl
                  ? `<a href="${escapeHtml(xUrl)}" target="_blank" rel="noopener">X post</a>`
                  : ""
              }
              <a href="${escapeHtml(aihotUrl)}" target="_blank" rel="noopener">AIHOT</a>
            </div>
          </div>
        </li>`;
    })
    .join("");
  revealListItems(".event", ul);
}

const MOOD_COPY = {
  ok: { en: "Fresh reset energy", zh: "刚重置不久，灯还暖着" },
  warn: { en: "Resting between resets", zh: "两次重置之间，慢慢歇" },
  resting: { en: "Deep rest mode", zh: "深度休息中，额度还在睡觉" },
  empty: { en: "No confirmed reset in feed yet", zh: "雷达里还没有确认的全局重置" },
};

function setMood(mode) {
  const lamp = $("mood-lamp");
  const moodClass = mode === "empty" ? "resting" : mode;
  lamp.className = `mood-lamp ${moodClass}${state.lampDimmed ? " dimmed" : ""}`;
  const copy = MOOD_COPY[mode] || MOOD_COPY.resting;
  $("status-text").textContent = copy.en;
  $("status-zh").textContent = copy.zh;
}

function tweetRestLabel() {
  const clock = $("rest-clock").textContent || "??";
  if (!clock || clock === "—") return "??";
  const latest = latestDirectReset(state.payload?.events || []);
  const when = latest ? eventTime(latest) : null;
  return when ? relativeRest(when) : clock;
}

function renderStatus(payload) {
  const events = payload?.events || [];
  const latest = latestDirectReset(events);
  const post = latest ? primaryPost(latest) : null;
  const when = latest ? eventTime(latest) : null;
  const restLabel = relativeRest(when);
  const statusMeta = $("status-meta");
  const statusQuote = $("status-quote");
  const checked = parseTs(payload?.checkedAt);

  if (!latest) {
    setMood("empty");
    statusMeta.textContent = "Radar waiting for the next public Tibo signal.";
    statusQuote.hidden = true;
    statusQuote.textContent = "";
    tickClock($("rest-clock"), "—");
  } else {
    const h = hoursAgo(when);
    if (h != null && h < 12) setMood("ok");
    else if (h != null && h < 48) setMood("warn");
    else setMood("resting");

    statusMeta.innerHTML = `Last confirmed <code>direct_reset</code> · <strong>${escapeHtml(
      fmtBeijing(when)
    )}</strong> Beijing · resting <strong>${escapeHtml(restLabel)}</strong>`;
    const q = post?.originalText || post?.text || latest.title || "";
    if (q) {
      statusQuote.hidden = false;
      statusQuote.textContent = q;
    } else {
      statusQuote.hidden = true;
      statusQuote.textContent = "";
    }
    tickClock($("rest-clock"), lobbyClock(when));
  }

  $("checked-at").textContent = checked ? fmtBeijing(checked) : "—";
  $("data-source").textContent =
    state.source === "live"
      ? "live AIHOT"
      : state.source === "fallback"
        ? "local snapshot"
        : "—";
  $("event-count").textContent = String(events.length || 0);

  $("tweet-preview").value = buildTweetText(
    restLabel || "??",
    $("tweet-note").value
  );
  renderTimeline(events);
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (res.status === 304) return { notModified: true, res };
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const data = await res.json();
  return { data, res };
}

async function loadData({ silent = false } = {}) {
  $("refresh-btn").disabled = true;
  try {
    const headers = { Accept: "application/json" };
    if (state.etag) headers["If-None-Match"] = state.etag;
    const live = await fetchJson(API_URL, {
      headers,
      mode: "cors",
      cache: "no-cache",
    });
    if (live.notModified) {
      if (!silent) toast("Radar already fresh");
      return;
    }
    state.payload = live.data;
    state.source = "live";
    state.etag = live.res.headers.get("ETag");
    renderStatus(state.payload);
    if (!silent) toast("Radar updated");
  } catch (err) {
    console.warn("live API failed", err);
    try {
      const fb = await fetchJson(FALLBACK_URL, { cache: "no-cache" });
      state.payload = fb.data;
      state.source = "fallback";
      renderStatus(state.payload);
      if (!silent) toast("Live API unavailable · using snapshot");
    } catch (err2) {
      console.error(err2);
      if (!silent) toast("Could not load reset data");
    }
  } finally {
    $("refresh-btn").disabled = false;
  }
}

function wireUi() {
  $("tweet-note").addEventListener("input", () => {
    $("tweet-preview").value = buildTweetText(
      tweetRestLabel(),
      $("tweet-note").value
    );
  });

  $("compose-btn").addEventListener("click", () => {
    const text = buildTweetText(tweetRestLabel(), $("tweet-note").value);
    $("tweet-preview").value = text;
    openTweet(text);
  });

  $("copy-btn").addEventListener("click", async () => {
    const text = $("tweet-preview").value;
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied");
    } catch {
      $("tweet-preview").select();
      toast("Select & copy manually");
    }
  });

  $("pray-btn").addEventListener("click", () => {
    const text = ($("pray-input").value || "").trim();
    if (!text) {
      toast("Write a short prayer first");
      return;
    }
    const list = loadPrayers();
    list.unshift({ text: text.slice(0, 200), at: Date.now() });
    savePrayers(list);
    $("pray-input").value = "";
    renderPrayers();
    toast("Prayer saved locally");
  });

  $("clear-prayers-btn").addEventListener("click", () => {
    savePrayers([]);
    renderPrayers();
    toast("Local prayers cleared");
  });

  $("vigil-btn").addEventListener("click", () => {
    const existing = loadVigil();
    if (existing) {
      saveVigil(null);
      renderVigil();
      toast("Vigil stamp cleared");
      return;
    }
    saveVigil({ at: Date.now() });
    renderVigil();
    toast("You’re resting · local stamp set");
    if (!prefersReducedMotion()) {
      const panel = document.querySelector(".vigil-panel");
      gsap.fromTo(
        panel,
        { scale: 0.985 },
        { scale: 1, duration: 0.55, ease: "expo.out" }
      );
    }
  });

  $("refresh-btn").addEventListener("click", () => loadData());

  // Interactive mood lamp — dim / brighten (lamp + circular “+” control)
  function toggleLampDim() {
    state.lampDimmed = !state.lampDimmed;
    $("mood-lamp").classList.toggle("dimmed", state.lampDimmed);
    const round = $("lamp-dim-btn");
    if (round) round.classList.toggle("is-active", state.lampDimmed);
    toast(state.lampDimmed ? "Lamp dimmed" : "Lamp bright");
    if (!prefersReducedMotion()) {
      gsap.fromTo(
        $("mood-lamp"),
        { scale: state.lampDimmed ? 1 : 0.96 },
        { scale: 1, duration: 0.5, ease: "expo.out" }
      );
    }
  }
  $("mood-lamp").addEventListener("click", toggleLampDim);
  $("lamp-dim-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleLampDim();
  });
}

wireUi();
renderPrayers();
renderVigil();
loadData({ silent: true });
setInterval(() => loadData({ silent: true }), POLL_MS);

setInterval(() => {
  if (state.payload) renderStatus(state.payload);
  renderVigil();
}, 60 * 1000);

void motion;
