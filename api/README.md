# layaaimodel-api

Cloudflare Worker gateway that authenticates customer `laya_…` keys, meters prepaid packs (same ladder as [jevtypesafe.org/pricing](https://jevtypesafe.org/pricing)), and proxies System-1 calls to Impossibl's Laya models.

## Product surface

| Feature | Endpoint / page |
| --- | --- |
| Decide | `POST /v1/decide` (= `/v1/systemone`) |
| Batch | `POST /v1/batch/decide` |
| Gate (free) | `POST /v1/gate` |
| Tools | `POST /v1/email/triage`, `/v1/support/triage`, … |
| Packs | `GET /v1/packs` + Stripe checkout |
| Account | register / login / keys / usage / alerts |
| Anon tools | 5 free runs per IP |

## Setup

```bash
cd api
npm install
npx wrangler d1 create layaaimodel-api
# paste database_id into wrangler.toml
npm run db:remote
# if upgrading an existing DB:
npm run db:migrate:remote
```

Secrets:

```bash
npx wrangler secret put IMPOSSIBL_API_KEY
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put SESSION_PEPPER
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

Deploy and attach `api.layaaimodel.com`. Stripe webhook: `https://api.layaaimodel.com/v1/billing/webhook`.

Site pages: `/pricing/`, `/tools/`, `/docs/api/`, `/account/`, `/status/`.
