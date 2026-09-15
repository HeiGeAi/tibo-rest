import "lenis/dist/lenis.css";

/**
 * Shared motion system — GSAP + ScrollTrigger (+ Lenis)
 * Primary ease: expo.out · animate only transform/opacity/clip-path
 * Respects prefers-reduced-motion
 * X lounge craft pass: focal wash, clip-path reveals, section pills
 */

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const REDUCE =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const EASE = "expo.out";
const EASE_SOFT = "power3.out";

let lenis = null;
let focalRaf = 0;

export function prefersReducedMotion() {
  return REDUCE;
}

/** Split text into word spans for kinetic typography */
export function splitWords(el) {
  if (!el || el.dataset.split === "1") return [];
  const text = el.textContent || "";
  el.dataset.split = "1";
  el.setAttribute("aria-label", text.trim());
  el.innerHTML = "";
  const words = text.trim().split(/(\s+)/);
  const spans = [];
  words.forEach((w) => {
    if (/^\s+$/.test(w)) {
      el.appendChild(document.createTextNode(w));
      return;
    }
    const wrap = document.createElement("span");
    wrap.className = "split-word";
    wrap.style.display = "inline-block";
    wrap.style.overflow = "hidden";
    wrap.style.verticalAlign = "bottom";
    const inner = document.createElement("span");
    inner.className = "split-word-inner";
    inner.style.display = "inline-block";
    if (/[\u4e00-\u9fff]/.test(w)) inner.style.whiteSpace = "nowrap";
    inner.textContent = w;
    wrap.appendChild(inner);
    el.appendChild(wrap);
    spans.push(inner);
  });
  return spans;
}

export function splitLines(container) {
  if (!container) return [];
  const lines = [...container.querySelectorAll(".line, .hero-line")];
  const all = [];
  lines.forEach((line) => {
    all.push(...splitWords(line));
  });
  return all;
}

/** Wrap [data-reveal-lines] titles for line stagger / clip wipe */
function prepareRevealLines(el) {
  if (!el || el.dataset.linesSplit === "1") return [];
  el.dataset.linesSplit = "1";
  const text = el.textContent.trim();
  el.setAttribute("aria-label", text);
  el.textContent = "";
  const wrap = document.createElement("span");
  wrap.className = "split-line";
  const inner = document.createElement("span");
  inner.className = "split-line-inner";
  inner.textContent = text;
  wrap.appendChild(inner);
  el.appendChild(wrap);
  return [inner];
}

function startLenis() {
  if (REDUCE || lenis) return null;
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.4,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || !lenis) return;
    const id = a.getAttribute("href");
    if (!id || id === "#") return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -12 });
  });

  return lenis;
}

/** Soft warm noise canvas behind hero — pause offscreen / reduced-motion */
function initFocalAtmosphere() {
  const layer = document.getElementById("focal-layer");
  const canvas = document.getElementById("focal-canvas");
  if (!layer || !canvas) return;

  if (REDUCE) {
    layer.classList.add("is-paused");
    canvas.style.display = "none";
    return;
  }

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  let running = true;
  let t0 = performance.now();

  const draw = (now) => {
    if (!running) return;
    const w = canvas.width;
    const h = canvas.height;
    const t = (now - t0) * 0.00008;
    ctx.clearRect(0, 0, w, h);

    // Soft drifting amber orbs (lightweight, no Three.js)
    const orbs = [
      { x: 0.28 + Math.sin(t) * 0.04, y: 0.32 + Math.cos(t * 0.7) * 0.03, r: 0.42, a: 0.18 },
      { x: 0.72 + Math.cos(t * 0.85) * 0.05, y: 0.22 + Math.sin(t * 0.6) * 0.04, r: 0.28, a: 0.1 },
      { x: 0.5 + Math.sin(t * 0.45) * 0.06, y: 0.7 + Math.cos(t * 0.5) * 0.04, r: 0.36, a: 0.08 },
    ];
    orbs.forEach((o) => {
      const cx = o.x * w;
      const cy = o.y * h;
      const rad = o.r * Math.max(w, h);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, `rgba(224,164,90,${o.a})`);
      g.addColorStop(0.55, `rgba(138,101,64,${o.a * 0.35})`);
      g.addColorStop(1, "rgba(12,9,7,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    });

    // Sparse warm grain speckles (static-ish, slow shift)
    const seed = Math.floor(t * 12) % 7;
    ctx.fillStyle = "rgba(243,235,224,0.045)";
    for (let i = 0; i < 90; i++) {
      const x = ((i * 37 + seed * 13) % w);
      const y = ((i * 53 + seed * 29) % h);
      if ((i + seed) % 3 === 0) ctx.fillRect(x, y, 1, 1);
    }

    focalRaf = requestAnimationFrame(draw);
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const on = entry.isIntersecting;
        layer.classList.toggle("is-offscreen", !on);
        layer.classList.toggle("is-paused", !on);
        if (on && !running) {
          running = true;
          t0 = performance.now();
          focalRaf = requestAnimationFrame(draw);
        } else if (!on && running) {
          running = false;
          cancelAnimationFrame(focalRaf);
        }
      });
    },
    { rootMargin: "80px" }
  );
  io.observe(layer);

  // Start
  running = true;
  focalRaf = requestAnimationFrame(draw);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(focalRaf);
      layer.classList.add("is-paused");
    } else if (!layer.classList.contains("is-offscreen")) {
      layer.classList.remove("is-paused");
      running = true;
      t0 = performance.now();
      focalRaf = requestAnimationFrame(draw);
    }
  });
}

/** Curtain / loader cold open → hero kinetic type */
export function runColdOpen() {
  const curtain = document.getElementById("curtain");
  const brand = document.querySelector(".topbar");
  const kicker = document.querySelector(".cold-open .kicker");
  const heroTitle = document.querySelector(".hero-title");
  const heroCn = document.querySelector(".hero-cn");
  const lede = document.querySelector(".cold-open .lede");
  const scrollCue = document.querySelector(".scroll-cue");

  if (REDUCE) {
    curtain?.classList.add("is-gone");
    document.body.classList.add("is-ready");
    return;
  }

  const wordInners = splitLines(heroTitle);
  const cnSpans = heroCn ? splitWords(heroCn) : [];

  gsap.set(wordInners, { yPercent: 110 });
  gsap.set(cnSpans, { yPercent: 110, opacity: 0 });
  gsap.set([kicker, lede, scrollCue, brand].filter(Boolean), { opacity: 0, y: 18 });

  const tl = gsap.timeline({
    defaults: { ease: EASE },
    onComplete: () => {
      curtain?.classList.add("is-gone");
      document.body.classList.add("is-ready");
    },
  });

  const top = curtain?.querySelector(".curtain-panel--top");
  const bot = curtain?.querySelector(".curtain-panel--bot");
  const mark = curtain?.querySelector(".curtain-mark");

  if (top && bot) {
    tl.to(top, { yPercent: -101, duration: 0.95, delay: 0.28 }, 0)
      .to(bot, { yPercent: 101, duration: 0.95 }, 0.28);
  } else if (curtain) {
    tl.to(curtain, { opacity: 0, duration: 0.6, delay: 0.28 });
  }
  if (mark) tl.to(mark, { opacity: 0, duration: 0.35 }, 0.4);

  tl.to(brand, { opacity: 1, y: 0, duration: 0.8 }, 0.55)
    .to(kicker, { opacity: 1, y: 0, duration: 0.7 }, 0.7)
    .to(wordInners, { yPercent: 0, duration: 1.05, stagger: 0.07 }, 0.75)
    .to(
      cnSpans,
      { yPercent: 0, opacity: 1, duration: 0.85, stagger: 0.05, ease: EASE_SOFT },
      1.0
    )
    .to(lede, { opacity: 1, y: 0, duration: 0.85 }, 1.15)
    .to(scrollCue, { opacity: 1, y: 0, duration: 0.7 }, 1.3);
}

/** Scroll-triggered reveals — opacity/y + optional clip-path wipe */
export function bindScrollReveals() {
  if (REDUCE) {
    document.querySelectorAll("[data-reveal], [data-reveal-wipe]").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.clipPath = "none";
    });
    document.querySelectorAll("[data-reveal-lines]").forEach((el) => {
      el.style.opacity = "1";
    });
    return;
  }

  gsap.utils.toArray("[data-reveal]").forEach((el, i) => {
    const delay = Number(el.dataset.revealDelay || 0);
    const useWipe = i % 3 === 0 || el.dataset.reveal === "wipe";

    if (useWipe) {
      el.setAttribute("data-reveal-wipe", "");
      gsap.fromTo(
        el,
        {
          opacity: 0,
          y: 28,
          clipPath: "inset(12% 0 88% 0)",
        },
        {
          opacity: 1,
          y: 0,
          clipPath: "inset(0% 0 0% 0)",
          duration: 1.15,
          delay,
          ease: EASE,
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
            once: true,
          },
        }
      );
    } else {
      gsap.fromTo(
        el,
        { opacity: 0, y: 36 },
        {
          opacity: 1,
          y: 0,
          duration: 1.05,
          delay,
          ease: EASE,
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
            once: true,
          },
        }
      );
    }
  });

  // Stagger section / panel title lines
  document.querySelectorAll("[data-reveal-lines]").forEach((el) => {
    const inners = prepareRevealLines(el);
    if (!inners.length) return;
    gsap.fromTo(
      inners,
      { yPercent: 115 },
      {
        yPercent: 0,
        duration: 1.05,
        ease: EASE,
        stagger: 0.08,
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          once: true,
        },
      }
    );
  });
}

/** Stagger timeline / prayer list items after render */
export function revealListItems(selector, scope) {
  const root = scope || document;
  const items = [...root.querySelectorAll(selector)];
  if (!items.length) return;
  if (REDUCE) {
    items.forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    return;
  }
  gsap.fromTo(
    items,
    { opacity: 0, y: 18, clipPath: "inset(0 0 100% 0)" },
    {
      opacity: 1,
      y: 0,
      clipPath: "inset(0 0 0% 0)",
      duration: 0.7,
      stagger: 0.055,
      ease: EASE_SOFT,
      overwrite: "auto",
      onComplete: () => bindMicroHovers(items),
    }
  );
}

function bindMicroHovers(nodes) {
  if (REDUCE) return;
  nodes.forEach((el) => {
    if (el.dataset.micro === "1") return;
    el.dataset.micro = "1";
    el.addEventListener("pointerenter", () => {
      gsap.to(el, { y: -2, duration: 0.35, ease: EASE_SOFT, overwrite: "auto" });
    });
    el.addEventListener("pointerleave", () => {
      gsap.to(el, { y: 0, duration: 0.45, ease: EASE });
    });
  });
}

/** Resting brass sign — subtle mouse parallax */
export function bindSignParallax() {
  const frame = document.querySelector(".rest-sign-frame");
  const stage = document.querySelector(".lobby-stage");
  if (!frame || !stage || REDUCE) return;

  const onMove = (e) => {
    const rect = stage.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(frame, {
      x: x * 10,
      y: y * 6,
      rotateY: x * 3.5,
      rotateX: -y * 2.5,
      duration: 0.9,
      ease: EASE_SOFT,
      overwrite: "auto",
    });
  };
  const onLeave = () => {
    gsap.to(frame, {
      x: 0,
      y: 0,
      rotateX: 0,
      rotateY: 0,
      duration: 1.1,
      ease: EASE,
    });
  };
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerleave", onLeave);
}

/** Mood lamp magnetic / tilt hover */
export function bindLampMagnet() {
  const lamp = document.getElementById("mood-lamp");
  if (!lamp || REDUCE) return;

  const max = 14;
  const onMove = (e) => {
    const r = lamp.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = (e.clientX - cx) / (r.width / 2);
    const dy = (e.clientY - cy) / (r.height / 2);
    const clampedX = Math.max(-1, Math.min(1, dx));
    const clampedY = Math.max(-1, Math.min(1, dy));
    gsap.to(lamp, {
      x: clampedX * max,
      y: clampedY * (max * 0.55),
      rotate: clampedX * 4,
      duration: 0.45,
      ease: EASE_SOFT,
      overwrite: "auto",
    });
  };
  const onLeave = () => {
    gsap.to(lamp, {
      x: 0,
      y: 0,
      rotate: 0,
      duration: 0.75,
      ease: EASE,
    });
  };
  lamp.addEventListener("pointermove", onMove);
  lamp.addEventListener("pointerleave", onLeave);
}

/** Magnetic primary CTA */
export function bindMagneticButtons() {
  if (REDUCE) return;
  document.querySelectorAll(".btn.solid, .btn.brass, .btn.magnetic, .btn-round").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      const strength = btn.classList.contains("btn-round") ? 0.35 : 0.28;
      gsap.to(btn, {
        x: x * strength,
        y: y * strength,
        duration: 0.35,
        ease: EASE_SOFT,
        overwrite: "auto",
      });
    });
    btn.addEventListener("pointerleave", () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.55, ease: EASE });
    });
  });
}

/** Tick rest-clock digits when value changes */
export function tickClock(el, nextText) {
  if (!el) return;
  const prev = el.textContent;
  if (prev === nextText) return;
  if (REDUCE) {
    el.textContent = nextText;
    return;
  }
  gsap.to(el, {
    y: -8,
    opacity: 0,
    duration: 0.22,
    ease: "power2.in",
    onComplete: () => {
      el.textContent = nextText;
      gsap.fromTo(
        el,
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, ease: EASE }
      );
    },
  });
}

/** Pause CSS loops when offscreen */
export function pauseOffscreenLoops() {
  const lamp = document.getElementById("mood-lamp");
  const mark = document.querySelector(".brand-mark");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-offscreen", !entry.isIntersecting);
      });
    },
    { rootMargin: "40px" }
  );
  if (lamp) io.observe(lamp);
  if (mark) io.observe(mark);
}

/** Section progress pills + top-nav active state */
export function bindSectionPills() {
  const sections = [
    ["sign", document.getElementById("sign")],
    ["radar", document.getElementById("radar")],
    ["prayers", document.getElementById("prayers")],
    ["faq", document.getElementById("faq")],
  ].filter(([, el]) => el);

  if (!sections.length) return;

  const setActive = (id) => {
    document.querySelectorAll("[data-nav]").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.nav === id);
    });
  };

  if (REDUCE) {
    // Still track active section without ScrollTrigger scrub junk
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const hit = sections.find(([, el]) => el === visible.target);
        if (hit) setActive(hit[0]);
      },
      { threshold: [0.2, 0.45, 0.7] }
    );
    sections.forEach(([, el]) => io.observe(el));
    return;
  }

  sections.forEach(([id, el]) => {
    ScrollTrigger.create({
      trigger: el,
      start: "top 55%",
      end: "bottom 45%",
      onEnter: () => setActive(id),
      onEnterBack: () => setActive(id),
    });
  });
}

export function bindFaqMotion() {
  if (REDUCE) return;
  document.querySelectorAll(".faq-list details").forEach((d) => {
    d.addEventListener("toggle", () => {
      if (!d.open) return;
      const p = d.querySelector("p");
      if (!p) return;
      gsap.fromTo(
        p,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.45, ease: EASE_SOFT }
      );
    });
  });
}

export function initMotion() {
  document.documentElement.classList.toggle("reduce-motion", REDUCE);

  if (!REDUCE) {
    startLenis();
    const stage = document.querySelector(".lobby-stage");
    if (stage) stage.style.perspective = "900px";
  }

  initFocalAtmosphere();
  runColdOpen();

  const after = () => {
    bindScrollReveals();
    bindSignParallax();
    bindLampMagnet();
    bindMagneticButtons();
    pauseOffscreenLoops();
    bindFaqMotion();
    bindSectionPills();
    ScrollTrigger.refresh();
  };

  if (REDUCE) {
    after();
    return { reduce: true, revealListItems, tickClock };
  }

  gsap.delayedCall(1.85, after);

  const breathe = document.querySelector(".breathe");
  if (breathe) {
    gsap.fromTo(
      breathe,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: EASE,
        scrollTrigger: { trigger: breathe, start: "top 92%", once: true },
      }
    );
  }

  return {
    reduce: false,
    revealListItems,
    tickClock,
    refresh: () => ScrollTrigger.refresh(),
  };
}

export { gsap, ScrollTrigger };
