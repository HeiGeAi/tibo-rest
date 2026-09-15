# BUILD_NOTES — tibo.rest critical redesign

Shipped: 2026-09-16 (Asia/Shanghai)  
Motion overhaul: 2026-09-16 (Asia/Shanghai)
X lounge craft pass: 2026-09-16 (Asia/Shanghai)

## Why the preview looked empty

GitHub Pages serves the project at `https://heigeai.github.io/tibo-rest/` (base path `/tibo-rest/`). The previous Vite build emitted absolute asset URLs (`/assets/...`), which 404 on project Pages. CSS and JS never loaded → blank/ugly page.

## Pages / asset-path fix

- `vite.config.js` sets `base: './'` so built HTML references **relative** assets (`./assets/index-….css`, `./assets/index-….js`).
- Favicon, apple-touch icon, and `site.webmanifest` use relative paths (`./favicon.svg`, etc.).
- `CONFIG.fallbackUrl` is `./data/fallback-events.json` so the snapshot resolves under both `/tibo-rest/` and `https://tibo.rest/`.
- Canonical / OG image URLs stay absolute on `https://tibo.rest/` (intended custom domain).

### Verify the Pages fix

```bash
npm run build
# Built HTML must NOT contain leading /assets — only ./assets/
rg -n 'href=|src=' dist/index.html
# Expect: ./assets/index-XXXX.css and ./assets/index-XXXX.js

python3 -m http.server 8080 --directory dist
# Open http://localhost:8080 and confirm CSS/JS load (200).
# Also fine under a subpath simulation:
mkdir -p /tmp/tibo-rest && cp -a dist/. /tmp/tibo-rest/
python3 -m http.server 8081 --directory /tmp
# Open http://localhost:8081/tibo-rest/ — assets still resolve.
```

## Motion stack (2026-09-16 overhaul)

| Piece | Choice |
|-------|--------|
| Core | **GSAP 3** + **ScrollTrigger** (`gsap`, `@gsap/scrolltrigger` via `gsap/ScrollTrigger`) |
| Smooth scroll | **Lenis** (`lenis`) — synced to `ScrollTrigger.update` via `gsap.ticker` |
| Primary ease | `expo.out` (hero / reveals); `power3.out` for soft micro-moves |
| Duration scale | ~0.35–0.55s micro · ~0.7–1.05s section · curtain ~0.95s |
| GPU rule | Animate **only** `transform` / `opacity` — no animated box-shadow / filter / backdrop-filter |
| Module | `src/motion.js` — cold open, scroll reveals, lamp magnet, sign parallax, magnetic CTAs, clock tick |

### Signature motion moments

1. **Curtain cold open** — dual espresso panels part; brand mark fades; kinetic word-split hero (`usage exhausted.` / italic `go rest.`) + Chinese line stagger in.
2. **Scroll reveals** — `[data-reveal]` sections fade/rise (opacity + y); timeline / prayer cards stagger after data render.
3. **Mood lamp** — magnetic tilt on pointer; click dim/brighten with scale settle; breathe loop pauses offscreen.
4. **RESTING brass sign** — subtle 3D parallax on lobby stage hover; rest-clock number tick on update.
5. **Magnetic primary CTAs** — Tweet / vigil / prayer solid+brass buttons track pointer lightly.

### `prefers-reduced-motion`

When `prefers-reduced-motion: reduce`:

- Lenis is **not** started; CSS `scroll-behavior: auto`.
- Curtain skipped / hidden; hero shows immediately (`body.is-ready`).
- ScrollTrigger / magnetic / parallax / split staggers disabled; content opacity forced visible.
- Lamp / brand-mark CSS loops `animation: none`.
- Clock / list updates set text without tick animation.

Test: DevTools → Rendering → Emulate CSS `prefers-reduced-motion: reduce`.

## Design decisions (HeiGe-UI)

**Locked aesthetic:** late-night hotel lobby / warm amber rest room — espresso `#0c0907` × amber `#e0a45a` × soft brass. Not purple-blue AI slop, not neon cyber dashboard, not three equal cards.

1. **Cold open** — giant Cormorant Garamond declaration + Chinese serif; left-aligned, extreme size contrast; curtain into kinetic type.
2. **Signature moment** — hotel-lobby-scale framed **RESTING** brass sign with live clock + interactive desk lamp.
3. **Pacing** — impact hero → breathe strip → lobby sign → asymmetric radar/compose → prayers/vigil → honesty FAQ close.
4. **Anti-slop** — no centered equal card grids, no purple gradients, no emoji icons, no Inter-only stack.
5. **Production** — Chinese system fallbacks; `.nowrap` / `clamp()`; transform/opacity only; reduced-motion honored.


## X lounge craft pass (2026-09-16)

Second craft pass informed by award-site patterns (Forms, MIRA, Zephyr, Aspen Search, RedNova, Mat Voyce). Motion stack **GSAP + Lenis** kept and enhanced — not ripped out.

### Visual changes

1. **Atmospheric focal layer** — lightweight canvas amber wash + slow CSS drift behind the hero (no Three.js); pauses via IntersectionObserver / `visibilitychange`; respects `prefers-reduced-motion`.
2. **Editorial type scale** — hero pushed larger (`clamp` up to ~8.6rem); section titles bigger; nav / section labels tighter, more letter-spaced; one clear protagonist title per section.
3. **Tactile micro-controls** — fixed section progress pills (desktop); soft **pill** CTAs; circular “+” watch-style secondary control to dim the lobby lamp.
4. **Scroll punctuation** — richer ScrollTrigger: alternating clip-path wipe + opacity/y; title line stagger (`data-reveal-lines`); list items use light clip wipe. Still only transform / opacity / clip-path.
5. **Texture** — SVG film-grain overlay + soft halftone dots (Aspen / Diego paper-hotel lobby), low opacity, `mix-blend-mode` only (no animated filters).
6. **Assets** — Vite `base: './'` unchanged; product features retained.

### Anti-goals honored

No purple AI gradients · no equal triple-card grids · no WebGL fireworks · mobile: progress pills hidden ≤720px, existing stack collapses preserved.

## Features retained

Mood lamp + hours since last confirmed `direct_reset`, tweet intent composer, Reset Radar (AIHOT + fallback), localStorage prayer wall, vigil stamp, bilingual Honesty FAQ, live AIHOT poll (≥5 min, If-None-Match), AIHOT footer attribution, Vite `base: './'`.

## Key paths

| Path | Role |
|------|------|
| `vite.config.js` | `base: './'` |
| `index.html` | Curtain + cold open + lobby shell |
| `src/styles.css` | Hotel-lobby UI |
| `src/motion.js` | GSAP / Lenis motion system (+ focal atmosphere, clip reveals, section pills) |
| `src/main.js` | App logic + lobby clock + lamp toggle |
| `src/config.js` | Relative fallback URL |
| `dist/` | Production build |

## Dependencies

```bash
npm install          # vite (dev) + gsap + lenis
npm run build        # → dist/
npm run preview
```

## Build

```bash
npm install && npm run build   # → dist/
npm run preview
```
