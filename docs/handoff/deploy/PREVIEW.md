# Deploy / preview

- Source of truth: https://github.com/HeiGeAi/tibo-rest
- Preview: https://heigeai.github.io/tibo-rest/
- Branches: main (source), gh-pages (static dist)
- Critical: Vite `base: './'` for project Pages subpath
- Target custom domain: tibo.rest (point DNS when server/CF ready)
- Suggested CF Pages: build `npm run build`, output `dist`, attach tibo.rest

Push Pages:
```bash
npm run build
# publish contents of dist/ to gh-pages branch
```
