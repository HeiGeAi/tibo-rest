# tibo.rest — Product & Build Plan

## Domain decision
**Use `tibo.rest` as an unofficial fan "rest room"** for Codex / ChatGPT Work users waiting on a Tibo (`@thsottiaux`) goodwill reset.

Competitors (codex-reset.com, aihot.news/codex-reset, codexreset.org) already own *serious* monitoring + forecasts. We do **not** clone them.

**Positioning:** emotional toy + community lounge when your quota is dead. Playful, meme-able, bilingual (EN primary + 中文), original shell. Data via AIHOT public API with attribution — never scrape their HTML.

## Non-goals
- No personal OpenAI account login / token scraping
- No claiming to predict resets as truth
- No commercial resale of AIHOT data
- No copying aihot UI / copy

## Finished product (v1 ship)
1. **Hero Rest Room** — mood lamp (resting / recently reset), time since last confirmed `direct_reset`, lounge copy
2. **One-click @Tibo intent** — compose tweet with resting duration + optional note + `tibo.rest`
3. **Reset Radar** — timeline of confirmed resets + banked credits from `GET https://aihot.news/api/v1/codex-resets` (poll ≥5min, If-None-Match, fallback JSON)
4. **Prayer wall** — localStorage v1; optional Cloudflare Worker shared wall later
5. **Resting vigil counter** — anonymous local "I'm resting" stamp; soft community vibe
6. **FAQ / honesty** — not affiliated with OpenAI; personal timers stay local; AIHOT attribution + terms link
7. **Mobile-first dark lounge UI** — high craft, not dashboard chrome
8. **Deployable static site** — Cloudflare Pages / Nginx ready; `README` with DNS + deploy

## Tech
- Static SPA (Vite or plain HTML/CSS/JS — prefer Vite + vanilla or lightweight for zero-ops)
- `public/data/fallback-events.json` snapshot
- Optional later: CF Worker for shared prayers (`/api/pray`) — not required for v1 ship if local wall works well
- Attribution footer: Data via [AIHOT](https://aihot.news/codex-reset)

## Success criteria
- Looks like a finished branded site, not a prototype
- Live API works in browser (CORS *)
- Offline/fallback works
- Tweet composer opens intent URL correctly
- README has one-command local preview + production deploy steps
- No scraped competitor HTML

## Inspiration (study, don't copy)
- aihot open API design (ETag, 5min poll)
- codex-reset.com vigil/prayer concepts (privacy-aware) → remix as lounge
- HeiGeAi product tone: sharp Chinese product craft, agent-native, not corporate
