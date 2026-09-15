# tibo.rest

Unofficial fan-made **Codex / ChatGPT Work Rest Room** for people waiting on goodwill resets from OpenAI’s Thibault “Tibo” Sottiaux ([@thsottiaux](https://x.com/thsottiaux)).

Late-night hotel lobby rest room — brass RESTING sign, mood lamp, reset radar, tweet intent, local prayer wall + vigil stamp. **Not** a clone of aihot.news/codex-reset or codex-reset.com.

> Not affiliated with OpenAI. No account login. No token scraping. No false prediction claims.

## Features

1. **Hero Rest Room** — mood lamp + hours since last confirmed `direct_reset`
2. **One-click Tweet intent** — `@thsottiaux` draft with resting duration + optional note + `tibo.rest`
3. **Reset Radar** — timeline of `direct_reset` + `reset_credit` with X / AIHOT links
4. **Prayer wall** — `localStorage` only
5. **“I’m resting” vigil stamp** — soft local mark
6. **Honesty FAQ** — bilingual EN + 中文
7. Favicon, OG meta, mobile-first hotel-lobby UI (relative assets for GH Pages + tibo.rest)

## Quick start

```bash
cd tibo-rest-v2
npm install
npm run dev          # http://localhost:5173
npm run build        # → dist/
npm run preview      # preview production build
```

Smoke-test the built site without Vite:

```bash
npm run build
python3 -m http.server 8080 --directory dist
# open http://localhost:8080
```

Refresh the offline API snapshot (optional):

```bash
npm run refresh-fallback
```

## Data source

- Live: `GET https://aihot.news/api/v1/codex-resets` (CORS `*`, poll ≥5 min, `If-None-Match`)
- Fallback: `public/data/fallback-events.json` (shipped with the build)
- Attribution in footer → [AIHOT Codex Reset](https://aihot.news/codex-reset)

Personal / non-commercial fan use. Commercial use of AIHOT data needs their written authorization ([terms](https://aihot.news/terms)).

## Deploy · GitHub Pages

This repo builds with Vite `base: './'` so **relative** asset URLs work on both:

- Project Pages: `https://heigeai.github.io/tibo-rest/` (subpath `/tibo-rest/`)
- Custom domain: `https://tibo.rest/`

Do **not** switch back to `base: '/'` unless you only serve from a domain root. After `npm run build`, confirm `dist/index.html` references `./assets/...` (no leading `/assets`).

Typical Actions / Pages settings: build command `npm run build`, publish `dist`.

## Deploy · Cloudflare Pages

1. Connect this folder (or push to your git remote) as a Pages project.
2. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** 18+
3. Custom domain: add `tibo.rest` (and `www` if you want) in Pages → Custom domains.
4. DNS: point `tibo.rest` to Cloudflare (proxied). Pages will issue certificates.

`public/_headers` and `public/_redirects` ship into `dist/` for SPA-friendly caching and fallbacks.

## Deploy · Nginx

```bash
npm run build
rsync -av --delete dist/ /var/www/tibo.rest/
```

```nginx
server {
  listen 443 ssl http2;
  server_name tibo.rest;
  root /var/www/tibo.rest;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  location /data/ {
    expires 60s;
    add_header Cache-Control "public, max-age=60, stale-while-revalidate=300";
  }
}
```

Point DNS `A`/`AAAA` (or CNAME) for `tibo.rest` at your server and terminate TLS (Certbot / Cloudflare).

## Config

Edit `src/config.js`:

| Key | Default | Notes |
|-----|---------|--------|
| `apiUrl` | AIHOT endpoint | Public CORS GET |
| `fallbackUrl` | `/data/fallback-events.json` | Offline snapshot |
| `pollMs` | `300000` (5 min) | Respect upstream |
| `tiboHandle` | `thsottiaux` | Tweet intent |

## License

MIT + disclaimer — see [LICENSE](./LICENSE).
