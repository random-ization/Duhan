---
description: how to deploy convex functions to production
---
# Convex Production Deployment

This project uses the **production** Convex deployment `calculating-cassowary-602`.

## Important

**DO NOT use `npx convex dev` without specifying the production deployment.**

The default `npx convex dev` will create or connect to a dev deployment, NOT production.

## Correct Commands

### Deploy to Production (One-time push)
```bash
// turbo
CONVEX_DEPLOYMENT=prod:calculating-cassowary-602 npx convex deploy
```

### Start Dev Mode Connected to Production
```bash
// turbo
CONVEX_DEPLOYMENT=prod:calculating-cassowary-602 npx convex dev
```

### View Production Logs
```bash
// turbo
npx convex logs --prod
```

### View Production Logs with History
```bash
// turbo
npx convex logs --prod --history 20
```

## Environment Variables

The production deployment URL is:
- `CONVEX_URL=https://calculating-cassowary-602.convex.cloud`

This should be set in `.env.local` or `.env.production` as `VITE_CONVEX_URL`.
