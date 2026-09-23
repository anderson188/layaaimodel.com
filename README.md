# layaaimodel.com

Unofficial community documentation for [Laya](https://github.com/NandhaKishorM/laya), an open source System-1 decision model. This site is not affiliated with Convai Innovations and is not the LayaAir game engine.

Pages are static English docs. There is no in-browser inference demo. Benchmark figures are transcribed from the upstream README and `BENCHMARKS.md`.

## Develop

```bash
npm install
npm run dev
```

## Static export

`next.config.ts` sets `output: "export"`. The build writes HTML to `out/`.

```bash
npm run build
```

## Cloudflare Pages

GitHub Actions (`.github/workflows/cloudflare-pages.yml`) builds on every push to `main` and deploys `out/` with Wrangler.

Repository secrets:

- `CLOUDFLARE_API_TOKEN` — token with Cloudflare Pages edit permission
- `CLOUDFLARE_ACCOUNT_ID`

`wrangler.jsonc` sets the Pages project name `layaaimodel` and output directory `out`.

Attach the custom domain `layaaimodel.com` on the Pages project after the first successful deploy. DNS for that domain needs to be on the same Cloudflare account.

Dashboard alternative, if you connect the Git repository directly: build command `npm run build`, output directory `out`, production branch `main`. Use either the Action or the dashboard Git connection, not both.
